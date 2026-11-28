using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.API.Tests.Integration;

[TestFixture]
public sealed class ChecklistsApiIntegrationTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private CustomWebApplicationFactory _factory = null!;
    private HttpClient _client = null!;

    [OneTimeSetUp]
    public void OneTimeSetUp()
    {
        _factory = new CustomWebApplicationFactory();
        _client = _factory.CreateClient();
    }

    [OneTimeTearDown]
    public void OneTimeTearDown()
    {
        _client.Dispose();
        _factory.Dispose();
    }

    [Test]
    public async Task Endpoints_WhenUnauthenticated_ShouldAllReturn401Unauthorized()
    {
        // Cenário: Chamadas anônimas aos endpoints GET, PUT e DELETE de /api/v1/checklists/current.
        // Objetivo: Garantir que toda a API de checklist on-line exija autenticação JWT Bearer.
        var getResponse = await _client.GetAsync("/api/v1/checklists/current");
        var putResponse = await _client.PutAsJsonAsync(
            "/api/v1/checklists/current",
            new UpsertUserKinkChecklistRequestDto("1.0.0", "pt-BR", "{}", DateTime.UtcNow));
        var deleteResponse = await _client.DeleteAsync("/api/v1/checklists/current");

        getResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        putResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        deleteResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Test]
    public async Task ChecklistLifecycle_GetPutConflictDelete_ShouldFollowFullContract()
    {
        // Cenário: Ciclo completo autenticado: GET (404) -> PUT (200, v1) -> GET (200) -> PUT (200, v2)
        // -> PUT com ExpectedVersion obsoleto (409) -> PUT force (200, v3) -> DELETE (200) -> GET (404).
        // Objetivo: Validar integração ponta-a-ponta de ChecklistsController, CQRS, serviço, EF Core e concorrência otimista.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"chk_{suffix}";
        const string password = "Str0ng!Password1";
        var tokens = await RegisterAndLoginAsync(login, $"chk_{suffix}@example.com", password);

        // 1. GET inicial -> 404
        var initialGet = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/checklists/current", tokens.AccessToken);
        initialGet.StatusCode.Should().Be(HttpStatusCode.NotFound);

        // 2. PUT inicial -> 200 (Version = 1)
        var put1 = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokens.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "pt-BR",
                "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
                DateTime.UtcNow));
        var put1Body = await put1.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        put1.StatusCode.Should().Be(HttpStatusCode.OK);
        put1Body!.Success.Should().BeTrue();
        put1Body.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistSaved);
        put1Body.Data!.Version.Should().Be(1);
        put1Body.Data.AnswersJson.Should().Contain("item_rope");

        // 2b. Verifica privacidade em repouso no banco: AnswersJson gravado apenas como payload Base64 (sem objeto envelope nem texto claro)
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<KinkConsentManagerDbContext>();
            var stored = await db.UserKinkCheclists.AsNoTracking().SingleAsync(c => c.Id == put1Body.Data.Id);
            using var storedDoc = JsonDocument.Parse(stored.AnswersJson);
            storedDoc.RootElement.ValueKind.Should().Be(JsonValueKind.String);
            stored.AnswersJson.Should().NotContain("__kcmProtected");
            stored.AnswersJson.Should().NotContain("AesGcm");
            stored.AnswersJson.Should().NotContain("item_rope");
        }

        // 3. GET -> 200
        var getAfterPut1 = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/checklists/current", tokens.AccessToken);
        var getBody = await getAfterPut1.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        getAfterPut1.StatusCode.Should().Be(HttpStatusCode.OK);
        getBody!.Data!.Version.Should().Be(1);
        getBody.Data.AnswersJson.Should().Contain("item_rope");

        // 4. PUT atualização com ExpectedVersion=1 -> 200 (Version = 2)
        var put2 = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokens.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "en-US",
                "{\"item_rope\":{\"primaryScale\":\"favorite\"}}",
                DateTime.UtcNow,
                ExpectedVersion: 1));
        var put2Body = await put2.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        put2.StatusCode.Should().Be(HttpStatusCode.OK);
        put2Body!.Data!.Version.Should().Be(2);
        put2Body.Data.Language.Should().Be("en-US");

        // 5. PUT com ExpectedVersion=1 desatualizada -> 409 Conflict
        var conflictPut = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokens.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "en-US",
                "{\"item_rope\":{\"primaryScale\":\"curious\"}}",
                DateTime.UtcNow,
                ExpectedVersion: 1));
        var conflictBody = await conflictPut.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        conflictPut.StatusCode.Should().Be(HttpStatusCode.Conflict);
        conflictBody!.Success.Should().BeFalse();
        conflictBody.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistVersionConflict);

        // 6. PUT com ExpectedVersion=null (sobrescrita explícita) -> 200 (Version = 3)
        var forcePut = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokens.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "pt-BR",
                "{\"item_cuffs\":{\"primaryScale\":\"enjoy\"}}",
                DateTime.UtcNow,
                ExpectedVersion: null));
        var forceBody = await forcePut.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        forcePut.StatusCode.Should().Be(HttpStatusCode.OK);
        forceBody!.Data!.Version.Should().Be(3);

        // 7. DELETE -> 200 e GET -> 404
        var deleteRes = await SendAuthorizedAsync(HttpMethod.Delete, "/api/v1/checklists/current", tokens.AccessToken);
        var deleteBody = await deleteRes.Content.ReadFromJsonAsync<ServiceResponse<bool>>(JsonOptions);

        deleteRes.StatusCode.Should().Be(HttpStatusCode.OK);
        deleteBody!.Data.Should().BeTrue();
        deleteBody.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistDeleted);

        var getAfterDelete = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/checklists/current", tokens.AccessToken);
        getAfterDelete.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Test]
    public async Task PutCurrent_InvalidPayloadWithAcceptLanguage_ShouldLocalizeValidationErrors()
    {
        // Cenário: Envio de PUT inválido (JSON malformado e idioma não suportado) em pt-BR e en-US.
        // Objetivo: Comprovar retorno 400 Bad Request com mensagens localizadas pelo header Accept-Language.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var tokens = await RegisterAndLoginAsync($"val_{suffix}", $"val_{suffix}@example.com", "Str0ng!Password1");
        var invalidPayload = new UpsertUserKinkChecklistRequestDto("1.0.0", "fr-FR", "[1,2]", DateTime.UtcNow);

        var ptRes = await SendAuthorizedAsync(HttpMethod.Put, "/api/v1/checklists/current", tokens.AccessToken, invalidPayload, "pt-BR");
        var enRes = await SendAuthorizedAsync(HttpMethod.Put, "/api/v1/checklists/current", tokens.AccessToken, invalidPayload, "en-US");

        ptRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        enRes.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var ptBody = await ptRes.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);
        var enBody = await enRes.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);

        ptBody!.Errors.Select(e => e.Description).Should().Contain(d => d != null && d.Contains("idiomas suportados", StringComparison.OrdinalIgnoreCase));
        enBody!.Errors.Select(e => e.Description).Should().Contain(d => d != null && d.Contains("Supported languages", StringComparison.OrdinalIgnoreCase));
    }

    [Test]
    public async Task ChecklistEndpoints_ShouldIsolateDataBetweenDistinctUsers()
    {
        // Cenário: Dois usuários distintos A e B utilizando o mesmo banco de teste.
        // Objetivo: Garantir isolamento estrito (anti-IDOR): usuário B nunca vê nem altera o checklist do usuário A.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var tokensA = await RegisterAndLoginAsync($"usera_{suffix}", $"usera_{suffix}@example.com", "Str0ng!Password1");
        var tokensB = await RegisterAndLoginAsync($"userb_{suffix}", $"userb_{suffix}@example.com", "Str0ng!Password1");

        var putA = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokensA.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "pt-BR",
                "{\"item_rope\":{\"primaryScale\":\"hard_limit\"}}",
                DateTime.UtcNow));
        putA.StatusCode.Should().Be(HttpStatusCode.OK);

        var getB = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/checklists/current", tokensB.AccessToken);
        getB.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var putB = await SendAuthorizedAsync(
            HttpMethod.Put,
            "/api/v1/checklists/current",
            tokensB.AccessToken,
            new UpsertUserKinkChecklistRequestDto(
                "1.0.0",
                "en-US",
                "{\"item_cuffs\":{\"primaryScale\":\"favorite\"}}",
                DateTime.UtcNow));
        putB.StatusCode.Should().Be(HttpStatusCode.OK);

        var getA = await SendAuthorizedAsync(HttpMethod.Get, "/api/v1/checklists/current", tokensA.AccessToken);
        var bodyA = await getA.Content.ReadFromJsonAsync<ServiceResponse<UserKinkChecklistDto>>(JsonOptions);
        bodyA!.Data!.AnswersJson.Should().Contain("item_rope").And.NotContain("item_cuffs");
    }

    private async Task<LoginResponseDto> RegisterAndLoginAsync(string login, string email, string password)
    {
        var regRes = await _client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserKinkRequestDto(login, email, password, password));
        regRes.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginRes = await _client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginDto
            {
                LoginOrEmail = login,
                Password = password
            });
        loginRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await loginRes.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);
        return body!.Data!;
    }

    private async Task<HttpResponseMessage> SendAuthorizedAsync(
        HttpMethod method,
        string uri,
        string accessToken,
        object? payload = null,
        string? acceptLanguage = null)
    {
        using var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        if (!string.IsNullOrWhiteSpace(acceptLanguage))
        {
            request.Headers.AcceptLanguage.ParseAdd(acceptLanguage);
        }

        if (payload is not null)
        {
            request.Content = JsonContent.Create(payload);
        }

        return await _client.SendAsync(request);
    }
}
