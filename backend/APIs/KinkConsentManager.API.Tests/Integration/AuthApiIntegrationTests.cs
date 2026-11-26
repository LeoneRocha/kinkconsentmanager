using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.API.Tests.Integration;

[TestFixture]
public sealed class AuthApiIntegrationTests
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
    public async Task HealthAndReadyEndpoints_ShouldReturn200Ok()
    {
        // Cenário: Chamada HTTP GET aos endpoints de liveness (/health) e readiness (/ready).
        // Objetivo: Verificar que a API inicializa corretamente no ambiente Testing e responde 200 OK nos health checks.
        var healthResponse = await _client.GetAsync("/health");
        var readyResponse = await _client.GetAsync("/ready");

        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        readyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Test]
    public async Task Register_ValidPayloadAndDuplicateChecks_ShouldReturn201WithoutPasswordAnd409OnDuplicates()
    {
        // Cenário: Cadastro de usuário inédito seguido de tentativas duplicadas com mesmo login e mesmo e-mail.
        // Objetivo: Garantir retorno 201 Created sem expor senha/hash no JSON e 409 Conflict para login ou e-mail duplicado.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"user_{suffix}";
        var email = $"user_{suffix}@example.com";
        const string password = "Str0ng!Password1";

        var registerRequest = new RegisterUserKinkRequestDto(
            "Test User",
            login,
            email,
            password,
            password);

        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", registerRequest);
        var rawJson = await registerResponse.Content.ReadAsStringAsync();

        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        using (var doc = JsonDocument.Parse(rawJson))
        {
            var dataElement = doc.RootElement.GetProperty("data");
            dataElement.TryGetProperty("password", out _).Should().BeFalse();
            dataElement.TryGetProperty("passwordHash", out _).Should().BeFalse();
        }

        rawJson.Should().NotContain(password);

        var envelope = JsonSerializer.Deserialize<ServiceResponse<UserKinkDto>>(rawJson, JsonOptions);
        envelope.Should().NotBeNull();
        envelope!.Success.Should().BeTrue();
        envelope.Data.Should().NotBeNull();
        envelope.Data!.Id.Should().BeGreaterThan(0);
        envelope.Data.Login.Should().Be(login);
        envelope.Data.Email.Should().Be(email);
        envelope.Data.IsActive.Should().BeTrue();

        var duplicateLoginRequest = new RegisterUserKinkRequestDto(
            "Another User",
            login,
            $"other_{suffix}@example.com",
            password,
            password);
        var duplicateLoginResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", duplicateLoginRequest);
        var duplicateLoginBody = await duplicateLoginResponse.Content.ReadFromJsonAsync<ServiceResponse<UserKinkDto>>(JsonOptions);

        duplicateLoginResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        duplicateLoginBody.Should().NotBeNull();
        duplicateLoginBody!.MessageKey.Should().Be(AuthenticationMessageKeys.LoginAlreadyExists);

        var duplicateEmailRequest = new RegisterUserKinkRequestDto(
            "Third User",
            $"other_{suffix}",
            email,
            password,
            password);
        var duplicateEmailResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", duplicateEmailRequest);
        var duplicateEmailBody = await duplicateEmailResponse.Content.ReadFromJsonAsync<ServiceResponse<UserKinkDto>>(JsonOptions);

        duplicateEmailResponse.StatusCode.Should().Be(HttpStatusCode.Conflict);
        duplicateEmailBody.Should().NotBeNull();
        duplicateEmailBody!.MessageKey.Should().Be(AuthenticationMessageKeys.EmailAlreadyExists);
    }

    [Test]
    public async Task Register_InvalidPayloadWithAcceptLanguage_ShouldLocalizeDescriptionsPreservingMessageKeys()
    {
        // Cenário: Envio de payload inválido (e-mail inválido e senha fraca) com Accept-Language pt-BR e depois en-US.
        // Objetivo: Comprovar negociação multi-idioma dinâmica em errors[].description mantendo messageKey idêntica.
        var invalidPayload = new RegisterUserKinkRequestDto(
            "Valid Name",
            "valid_login",
            "email-invalido",
            "weak",
            "weak");

        var ptResponse = await PostWithLanguageAsync("/api/v1/auth/register", invalidPayload, "pt-BR");
        var enResponse = await PostWithLanguageAsync("/api/v1/auth/register", invalidPayload, "en-US");

        ptResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        enResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var ptEnvelope = await ptResponse.Content.ReadFromJsonAsync<ServiceResponse<UserKinkDto>>(JsonOptions);
        var enEnvelope = await enResponse.Content.ReadFromJsonAsync<ServiceResponse<UserKinkDto>>(JsonOptions);

        ptEnvelope.Should().NotBeNull();
        enEnvelope.Should().NotBeNull();
        ptEnvelope!.Errors.Should().NotBeEmpty();
        enEnvelope!.Errors.Should().NotBeEmpty();

        var ptCodes = ptEnvelope.Errors.Select(e => e.Code).ToList();
        var enCodes = enEnvelope.Errors.Select(e => e.Code).ToList();
        ptCodes.Should().BeEquivalentTo(enCodes);
        ptCodes.Should().Contain("KinkConsentManager.Domain.RegisterUserKinkValidator.EmailInvalid");
        ptCodes.Should().Contain("KinkConsentManager.Domain.PasswordValidator.Rule5");

        var ptMessageKeys = ptEnvelope.Errors.Select(e => e.MessageKey).ToList();
        var enMessageKeys = enEnvelope.Errors.Select(e => e.MessageKey).ToList();
        ptMessageKeys.Should().Equal(enMessageKeys);

        foreach (var code in ptCodes.Distinct())
        {
            var ptDescriptions = ptEnvelope.Errors
                .Where(e => e.Code == code)
                .Select(e => e.Description)
                .ToList();
            var enDescriptions = enEnvelope.Errors
                .Where(e => e.Code == code)
                .Select(e => e.Description)
                .ToList();

            ptDescriptions.Should().NotBeEquivalentTo(enDescriptions);
        }

        ptEnvelope.Errors.Select(e => e.Description).Should().Contain(d => d != null && d.Contains("maiúscula", StringComparison.OrdinalIgnoreCase));
        enEnvelope.Errors.Select(e => e.Description).Should().Contain(d => d != null && d.Contains("uppercase", StringComparison.OrdinalIgnoreCase));
    }

    [Test]
    public async Task Login_DualCaseInsensitiveLoginAndEmail_ShouldReturn200WithJwtBearer()
    {
        // Cenário: Usuário cadastrado como "Alex_Silva" / "alex@example.com" autentica usando "ALEX_SILVA" e "ALEX@EXAMPLE.COM".
        // Objetivo: Comprovar autenticação dual (login e e-mail) case-insensitive retornando 200 OK e JWT Bearer.
        const string password = "Str0ng!Password1";
        var registerRequest = new RegisterUserKinkRequestDto(
            "Alex Silva",
            "Alex_Silva",
            "alex@example.com",
            password,
            password);

        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", registerRequest);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var loginByUpperLogin = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginDto
        {
            LoginOrEmail = "ALEX_SILVA",
            Password = password
        });
        var loginByUpperLoginBody = await loginByUpperLogin.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        loginByUpperLogin.StatusCode.Should().Be(HttpStatusCode.OK);
        loginByUpperLoginBody.Should().NotBeNull();
        loginByUpperLoginBody!.Success.Should().BeTrue();
        loginByUpperLoginBody.Data.Should().NotBeNull();
        loginByUpperLoginBody.Data!.TokenType.Should().Be("Bearer");
        loginByUpperLoginBody.Data.AccessToken.Should().NotBeNullOrWhiteSpace();
        loginByUpperLoginBody.Data.RefreshToken.Should().NotBeNullOrWhiteSpace();
        loginByUpperLoginBody.Data.User.Login.Should().Be("Alex_Silva");
        loginByUpperLoginBody.Data.User.Email.Should().Be("alex@example.com");

        var loginByUpperEmail = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginDto
        {
            LoginOrEmail = "ALEX@EXAMPLE.COM",
            Password = password
        });
        var loginByUpperEmailBody = await loginByUpperEmail.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        loginByUpperEmail.StatusCode.Should().Be(HttpStatusCode.OK);
        loginByUpperEmailBody.Should().NotBeNull();
        loginByUpperEmailBody!.Success.Should().BeTrue();
        loginByUpperEmailBody.Data.Should().NotBeNull();
        loginByUpperEmailBody.Data!.TokenType.Should().Be("Bearer");
        loginByUpperEmailBody.Data.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    [Test]
    public async Task Login_WithWrongPasswordOrInvalidEmailWithoutTld_ShouldReturn401WithSameMessageKey()
    {
        // Cenário: Tentativas de login com senha incorreta para usuário válido e com e-mail "invalido@semtld".
        // Objetivo: Garantir resposta uniforme 401 Unauthorized com MessageKey Auth.InvalidCredentials (anti-enumeração).
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"anti_{suffix}";
        var email = $"anti_{suffix}@example.com";
        const string password = "Str0ng!Password1";

        await RegisterUserAsync("Anti Enum", login, email, password);

        var wrongPasswordResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginDto
        {
            LoginOrEmail = login,
            Password = "Wrong!Password9"
        });
        var wrongPasswordBody = await wrongPasswordResponse.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        var invalidEmailResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new LoginDto
        {
            LoginOrEmail = "invalido@semtld",
            Password = password
        });
        var invalidEmailBody = await invalidEmailResponse.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        wrongPasswordResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        invalidEmailResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        wrongPasswordBody.Should().NotBeNull();
        invalidEmailBody.Should().NotBeNull();
        wrongPasswordBody!.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidCredentials);
        invalidEmailBody!.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidCredentials);
    }

    [Test]
    public async Task Me_WithoutTokenAndWithValidBearerToken_ShouldReturn401Then200()
    {
        // Cenário: Requisição GET /api/v1/auth/me sem token seguida de requisição autenticada com Bearer AccessToken.
        // Objetivo: Validar proteção JWT do endpoint /me (401 sem token) e retorno do perfil do usuário (200 com token).
        var unauthenticatedResponse = await _client.GetAsync("/api/v1/auth/me");
        unauthenticatedResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"me_{suffix}";
        var email = $"me_{suffix}@example.com";
        const string password = "Str0ng!Password1";

        await RegisterUserAsync("Profile User", login, email, password);
        var tokens = await LoginAsync(login, password);

        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        var authenticatedResponse = await _client.SendAsync(request);
        var body = await authenticatedResponse.Content.ReadFromJsonAsync<ServiceResponse<UserKinkDto>>(JsonOptions);

        authenticatedResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().NotBeNull();
        body!.Success.Should().BeTrue();
        body.Data.Should().NotBeNull();
        body.Data!.Login.Should().Be(login);
        body.Data.Email.Should().Be(email);
        body.Data.Name.Should().Be("Profile User");
    }

    [Test]
    public async Task Refresh_RotationAndReuseDetection_ShouldRotateTokensAndRevokeOnReuse()
    {
        // Cenário: Rotação válida de refresh token seguida de reutilização maliciosa do refresh token antigo.
        // Objetivo: Comprovar rotação (200 OK com novos tokens) e Reuse Detection (401 com Auth.RefreshTokenReused e revogação).
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"refresh_{suffix}";
        var email = $"refresh_{suffix}@example.com";
        const string password = "Str0ng!Password1";

        await RegisterUserAsync("Refresh User", login, email, password);
        var initialTokens = await LoginAsync(login, password);

        var rotateResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/refresh",
            new RefreshTokenDto { Token = initialTokens.RefreshToken });
        var rotateBody = await rotateResponse.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        rotateResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        rotateBody.Should().NotBeNull();
        rotateBody!.Success.Should().BeTrue();
        rotateBody.Data.Should().NotBeNull();
        rotateBody.Data!.AccessToken.Should().NotBeNullOrWhiteSpace();
        rotateBody.Data.RefreshToken.Should().NotBeNullOrWhiteSpace();
        rotateBody.Data.RefreshToken.Should().NotBe(initialTokens.RefreshToken);

        var reuseResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/refresh",
            new RefreshTokenDto { Token = initialTokens.RefreshToken });
        var reuseBody = await reuseResponse.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);

        reuseResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        reuseBody.Should().NotBeNull();
        reuseBody!.Success.Should().BeFalse();
        reuseBody.MessageKey.Should().Be(AuthenticationMessageKeys.RefreshTokenReused);

        var rotatedAfterReuseResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/refresh",
            new RefreshTokenDto { Token = rotateBody.Data.RefreshToken });
        rotatedAfterReuseResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Test]
    public async Task Logout_AuthenticatedSession_ShouldRevokeRefreshToken()
    {
        // Cenário: Usuário autenticado realiza logout enviando seu refresh token e depois tenta reutilizá-lo no /refresh.
        // Objetivo: Verificar que POST /api/v1/auth/logout retorna 200 OK e revoga o refresh token, falhando com 401 depois.
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var login = $"logout_{suffix}";
        var email = $"logout_{suffix}@example.com";
        const string password = "Str0ng!Password1";

        await RegisterUserAsync("Logout User", login, email, password);
        var tokens = await LoginAsync(login, password);

        using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/logout")
        {
            Content = JsonContent.Create(new LogoutRequestDto(tokens.RefreshToken))
        };
        logoutRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        var logoutResponse = await _client.SendAsync(logoutRequest);
        var logoutBody = await logoutResponse.Content.ReadFromJsonAsync<ServiceResponse<bool>>(JsonOptions);

        logoutResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        logoutBody.Should().NotBeNull();
        logoutBody!.Success.Should().BeTrue();
        logoutBody.Data.Should().BeTrue();

        var refreshAfterLogoutResponse = await _client.PostAsJsonAsync(
            "/api/v1/auth/refresh",
            new RefreshTokenDto { Token = tokens.RefreshToken });
        refreshAfterLogoutResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<HttpResponseMessage> PostWithLanguageAsync<T>(string uri, T payload, string acceptLanguage)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.AcceptLanguage.ParseAdd(acceptLanguage);
        return await _client.SendAsync(request);
    }

    private async Task RegisterUserAsync(string name, string login, string email, string password)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterUserKinkRequestDto(name, login, email, password, password));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task<LoginResponseDto> LoginAsync(string loginOrEmail, string password)
    {
        var response = await _client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginDto
            {
                LoginOrEmail = loginOrEmail,
                Password = password
            });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<ServiceResponse<LoginResponseDto>>(JsonOptions);
        body.Should().NotBeNull();
        body!.Data.Should().NotBeNull();
        return body.Data!;
    }
}
