using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Service.API.DI;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.Helpers.Security;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Compression;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Security;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class DependencyInjectionGraphTests
{
    [Test]
    public void Configure_WithValidSecretAndInMemoryProvider_ShouldResolveCoreServicesWithoutCircularDependencies()
    {
        // Cenário: Inicialização do grafo completo de DI via WebApplicationBuilderServicesConfigure.Configure com DatabaseProvider = INMEMORY e segredo >= 64 bytes.
        // Objetivo: Garantir que IAuthenticationService, IApplicationDispatcher, IValidationMessageService e IValidator<RegisterUserKinkRequestDto> sejam resolvidos sem erros.
        var tempKeysPath = Path.Combine(Path.GetTempPath(), $"kcm-dp-tests-{Guid.NewGuid():N}");
        try
        {
            var builder = WebApplication.CreateBuilder();
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DatabaseProvider"] = "INMEMORY",
                ["TokenConfigurations:Secret"] = new string('S', 64),
                ["TokenConfigurations:Issuer"] = "KinkConsentManager.API",
                ["TokenConfigurations:Audience"] = "KinkConsentManager.Client",
                ["TokenConfigurations:Minutes"] = "60",
                ["TokenConfigurations:DaysToExpiry"] = "7",
                ["SecuritySettings:CryptoType"] = "AesGcm",
                ["SecuritySettings:AesGcmSettings:Key"] = AesKeyGeneratorHelper.GenerateKey(),
                ["ChecklistProtection:Enabled"] = "true",
                ["ChecklistProtection:CryptoAlgorithm"] = "AesGcm",
                ["ChecklistProtection:CompressionAlgorithm"] = "Zstd",
                ["Cors:AllowedOrigins:0"] = "http://localhost:4200",
                ["DataProtection:KeysPath"] = tempKeysPath,
                ["DataProtection:ApplicationName"] = "KinkConsentManager.Tests"
            });

            WebApplicationBuilderServicesConfigure.Configure(builder);

            using var app = builder.Build();
            using var scope = app.Services.CreateScope();
            var sp = scope.ServiceProvider;

            sp.GetRequiredService<IAuthenticationService>().Should().NotBeNull();
            sp.GetRequiredService<IUserKinkChecklistRepository>().Should().NotBeNull();
            sp.GetRequiredService<IUserKinkChecklistService>().Should().NotBeNull();
            sp.GetRequiredService<ICryptoService>().Should().NotBeNull();
            sp.GetRequiredService<ICompressionService>().Should().NotBeNull();
            sp.GetRequiredService<IChecklistPayloadProtector>().Should().NotBeNull();
            sp.GetRequiredService<IApplicationDispatcher>().Should().NotBeNull();
            sp.GetRequiredService<IValidationMessageService>().Should().NotBeNull();
            sp.GetRequiredService<IValidator<RegisterUserKinkRequestDto>>().Should().NotBeNull();
            sp.GetRequiredService<IValidator<UpsertUserKinkChecklistRequestDto>>().Should().NotBeNull();
        }
        finally
        {
            if (Directory.Exists(tempKeysPath))
            {
                Directory.Delete(tempKeysPath, recursive: true);
            }
        }
    }

    [Test]
    public void Configure_WhenJwtSecretIsShorterThan64Bytes_ShouldThrowInvalidOperationException()
    {
        // Cenário: Configuração de startup informando TokenConfigurations:Secret com menos de 64 bytes (512 bits) exigidos para HS512.
        // Objetivo: Garantir falha imediata no startup com InvalidOperationException.
        var tempKeysPath = Path.Combine(Path.GetTempPath(), $"kcm-dp-short-{Guid.NewGuid():N}");
        try
        {
            var builder = WebApplication.CreateBuilder();
            builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DatabaseProvider"] = "INMEMORY",
                ["TokenConfigurations:Secret"] = new string('S', 63),
                ["TokenConfigurations:Issuer"] = "KinkConsentManager.API",
                ["TokenConfigurations:Audience"] = "KinkConsentManager.Client",
                ["TokenConfigurations:Minutes"] = "60",
                ["TokenConfigurations:DaysToExpiry"] = "7",
                ["SecuritySettings:CryptoType"] = "AesGcm",
                ["SecuritySettings:AesGcmSettings:Key"] = AesKeyGeneratorHelper.GenerateKey(),
                ["Cors:AllowedOrigins:0"] = "http://localhost:4200",
                ["DataProtection:KeysPath"] = tempKeysPath
            });

            var act = () => WebApplicationBuilderServicesConfigure.Configure(builder);

            act.Should().Throw<InvalidOperationException>()
                .WithMessage("*64 bytes*");
        }
        finally
        {
            if (Directory.Exists(tempKeysPath))
            {
                Directory.Delete(tempKeysPath, recursive: true);
            }
        }
    }
}
