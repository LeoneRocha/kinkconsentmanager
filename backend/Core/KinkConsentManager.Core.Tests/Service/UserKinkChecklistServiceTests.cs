using System.Globalization;
using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Checklists;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Service.API.DI;
using KinkConsentManager.Core.Service.Localization;
using KinkConsentManager.Core.Service.Mappings;
using KinkConsentManager.Core.Service.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.Helpers.Security;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Infrastructure.DependencyInjection;
using SmartCoreHub.Core.SDK.Service.API.DI.Mapping.Extensions;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class UserKinkChecklistServiceTests
{
    private ServiceProvider _serviceProvider = null!;
    private Mock<IUserKinkChecklistRepository> _repositoryMock = null!;
    private Mock<IAppLogger> _loggerMock = null!;
    private UserKinkChecklistService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        _repositoryMock = new Mock<IUserKinkChecklistRepository>();
        _loggerMock = new Mock<IAppLogger>();

        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SecuritySettings:CryptoType"] = "AesGcm",
                ["SecuritySettings:AesGcmSettings:Key"] = AesKeyGeneratorHelper.GenerateKey(),
                ["ChecklistProtection:Enabled"] = "true",
                ["ChecklistProtection:CryptoAlgorithm"] = "AesGcm",
                ["ChecklistProtection:CompressionAlgorithm"] = "Zstd"
            })
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.AddLogging();
        services.AddChecklistPayloadProtection(configuration);
        services.AddSmartCoreHubFunctionalMessages(
            options =>
            {
                options.DefaultCulture = new CultureInfo("en-US");
                options.SupportedCultures = new List<CultureInfo>
                {
                    new("en-US"),
                    new("pt-BR")
                };
            },
            typeof(KinkConsentManagerDbContext).Assembly,
            "KinkConsentManager.Core.Infrastructure.Localization.Resources");
        services.AddSdkAutoMapper(typeof(AutoMapperProfile).Assembly);
        services.AddScoped<IValidationMessageService, ValidationMessageService>();
        services.AddScoped<IErrorGetLocalizationService>(sp =>
            (ValidationMessageService)sp.GetRequiredService<IValidationMessageService>());
        services.AddValidatorsFromAssemblyContaining<UpsertUserKinkChecklistRequestValidator>();

        _serviceProvider = services.BuildServiceProvider();

        _sut = new UserKinkChecklistService(
            _repositoryMock.Object,
            _serviceProvider.GetRequiredService<ISmartCoreHubMapper>(),
            _loggerMock.Object,
            _serviceProvider.GetRequiredService<IValidator<UpsertUserKinkChecklistRequestDto>>(),
            _serviceProvider.GetRequiredService<IValidationMessageService>(),
            _serviceProvider.GetRequiredService<IErrorGetLocalizationService>(),
            _serviceProvider.GetRequiredService<IChecklistPayloadProtector>());
    }

    [TearDown]
    public void TearDown()
    {
        _serviceProvider.Dispose();
    }

    [Test]
    public async Task GetCurrentAsync_WhenChecklistExists_ShouldReturn200WithDto()
    {
        // Cenário: Registro ativo existente na tabela UserKinkCheclists para o usuário 42.
        // Objetivo: Retornar HTTP 200 com UserKinkChecklistDto e MessageKey Checklist.Retrieved.
        var entity = new UserKinkCheclist
        {
            Id = 15,
            UserKinkId = 42,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            ClientUpdatedAtUtc = new DateTime(2026, 11, 27, 12, 0, 0, DateTimeKind.Utc),
            Version = 3,
            IsActive = true
        };

        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(entity);

        var response = await _sut.GetCurrentAsync(42);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistRetrieved);
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(15);
        response.Data.Version.Should().Be(3);
        response.Data.AnswersJson.Should().Be(entity.AnswersJson);
    }

    [Test]
    public async Task GetCurrentAsync_WhenChecklistIsMissing_ShouldReturn404()
    {
        // Cenário: Usuário ainda não salvou checklist on-line.
        // Objetivo: Retornar 404 Not Found com MessageKey Checklist.NotFound.
        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserKinkCheclist?)null);

        var response = await _sut.GetCurrentAsync(42);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(404);
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistNotFound);
    }

    [Test]
    public async Task UpsertCurrentAsync_WhenPayloadIsInvalid_ShouldReturn400WithoutCallingRepository()
    {
        // Cenário: Payload com JSON inválido e idioma não suportado.
        // Objetivo: Retornar 400 Bad Request localizado sem consultar ou persistir no repositório.
        var invalidRequest = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "es-ES",
            "{broken-json",
            DateTime.UtcNow);

        var response = await _sut.UpsertCurrentAsync(42, invalidRequest);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(400);
        response.Errors.Should().NotBeEmpty();
        _repositoryMock.Verify(
            r => r.GetByUserKinkIdAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Test]
    public async Task UpsertCurrentAsync_WhenCreatingFirstChecklist_ShouldPersistVersion1WithoutLoggingAnswersJson()
    {
        // Cenário: Primeiro salvamento on-line de um usuário sem registro prévio.
        // Objetivo: Criar entidade com Version=1, retornar 200 OK e nunca logar o conteúdo de AnswersJson.
        const string sensitiveAnswers = "{\"item_safeword\":{\"otherText\":\"segredo-privado-123\"}}";
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            sensitiveAnswers,
            new DateTime(2026, 11, 27, 15, 30, 0, DateTimeKind.Unspecified));

        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserKinkCheclist?)null);

        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<UserKinkCheclist>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserKinkCheclist entity, CancellationToken _) =>
            {
                entity.Id = 99;
                return entity;
            });

        var response = await _sut.UpsertCurrentAsync(7, request);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistSaved);
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(99);
        response.Data.Version.Should().Be(1);
        response.Data.ClientUpdatedAtUtc.Kind.Should().Be(DateTimeKind.Utc);

        _loggerMock.Verify(
            l => l.LogInfo(
                It.IsAny<string>(),
                It.Is<object[]>(args => args.All(a => !Convert.ToString(a)!.Contains("segredo-privado-123", StringComparison.Ordinal)))),
            Times.AtLeastOnce);
    }

    [Test]
    public async Task UpsertCurrentAsync_WhenUpdatingWithMatchingExpectedVersion_ShouldIncrementVersion()
    {
        // Cenário: Atualização de checklist existente informando ExpectedVersion igual à Version atual (1).
        // Objetivo: Incrementar Version para 2 e retornar 200 OK com dados atualizados.
        var existing = new UserKinkCheclist
        {
            Id = 50,
            UserKinkId = 7,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{\"item_rope\":{\"primaryScale\":\"curious\"}}",
            ClientUpdatedAtUtc = DateTime.UtcNow.AddMinutes(-5),
            Version = 1,
            IsActive = true
        };

        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "en-US",
            "{\"item_rope\":{\"primaryScale\":\"favorite\"}}",
            DateTime.UtcNow,
            ExpectedVersion: 1);

        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _repositoryMock
            .Setup(r => r.UpdateAsync(existing, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var response = await _sut.UpsertCurrentAsync(7, request);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.Data.Should().NotBeNull();
        response.Data!.Version.Should().Be(2);
        response.Data.Language.Should().Be("en-US");
        response.Data.AnswersJson.Should().Contain("favorite");
    }

    [Test]
    public async Task UpsertCurrentAsync_WhenExpectedVersionDiffers_ShouldReturn409Conflict()
    {
        // Cenário: Cliente envia ExpectedVersion=1 enquanto o banco já está na Version=3.
        // Objetivo: Impedir sobrescrita silenciosa retornando 409 Conflict com Checklist.VersionConflict.
        var existing = new UserKinkCheclist
        {
            Id = 50,
            UserKinkId = 7,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{}",
            ClientUpdatedAtUtc = DateTime.UtcNow,
            Version = 3,
            IsActive = true
        };

        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            DateTime.UtcNow,
            ExpectedVersion: 1);

        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var response = await _sut.UpsertCurrentAsync(7, request);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(409);
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistVersionConflict);
        _repositoryMock.Verify(
            r => r.UpdateAsync(It.IsAny<UserKinkCheclist>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Test]
    public async Task UpsertCurrentAsync_WhenRepositoryThrowsDbUpdateConcurrencyException_ShouldReturn409Conflict()
    {
        // Cenário: Concorrência simultânea no EF Core lançando DbUpdateConcurrencyException no UpdateAsync.
        // Objetivo: Converter a exceção em 409 Conflict com Checklist.VersionConflict.
        var existing = new UserKinkCheclist
        {
            Id = 50,
            UserKinkId = 7,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{}",
            ClientUpdatedAtUtc = DateTime.UtcNow,
            Version = 2,
            IsActive = true
        };

        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            DateTime.UtcNow,
            ExpectedVersion: 2);

        _repositoryMock
            .Setup(r => r.GetByUserKinkIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);
        _repositoryMock
            .Setup(r => r.UpdateAsync(existing, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new DbUpdateConcurrencyException("Concurrency conflict"));

        var response = await _sut.UpsertCurrentAsync(7, request);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(409);
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistVersionConflict);
    }

    [TestCase(true)]
    [TestCase(false)]
    public async Task DeleteCurrentAsync_ShouldBeIdempotentAndReturn200(bool existed)
    {
        // Cenário: Exclusão do checklist salvo tanto quando existe quanto quando já não existe no banco.
        // Objetivo: Garantir resposta 200 OK idempotente com Data=true e Checklist.Deleted.
        _repositoryMock
            .Setup(r => r.DeleteByUserKinkIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existed);

        var response = await _sut.DeleteCurrentAsync(42);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.Data.Should().BeTrue();
        response.MessageKey.Should().Be(ChecklistMessageKeys.ChecklistDeleted);
    }
}
