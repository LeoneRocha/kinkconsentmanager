using System.Security.Cryptography;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SmartCoreHub.Core.SDK.Infrastructure.Data.DependencyInjection;

namespace KinkConsentManager.API.Tests.Integration;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = $"InMemoryTestDb-{Guid.NewGuid()}";
    private readonly string _jwtSecret = Convert.ToHexString(RandomNumberGenerator.GetBytes(40));
    private readonly string _aesGcmKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
    private readonly Dictionary<string, string?> _previousEnvironmentValues = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        var testSettings = new Dictionary<string, string?>
        {
            ["DatabaseProvider"] = "INMEMORY",
            ["Database:SkipInitialization"] = "true",
            ["ConnectionStrings:DefaultConnection"] = _databaseName,
            ["TokenConfigurations:Secret"] = _jwtSecret,
            ["TokenConfigurations:Issuer"] = "KinkConsentManager.API.Tests",
            ["TokenConfigurations:Audience"] = "KinkConsentManager.Client.Tests",
            ["TokenConfigurations:Minutes"] = "60",
            ["TokenConfigurations:DaysToExpiry"] = "7",
            ["SecuritySettings:CryptoType"] = "AesGcm",
            ["SecuritySettings:AesGcmSettings:Key"] = _aesGcmKey,
            ["ChecklistProtection:EnableCompress"] = "true",
            ["ChecklistProtection:EnableCryptography"] = "true",
            ["ChecklistProtection:CryptoAlgorithm"] = "AesGcm",
            ["ChecklistProtection:CompressionAlgorithm"] = "Zstd",
            ["Localization:FunctionalMessages:DefaultCulture"] = "en-US",
            ["Localization:FunctionalMessages:AllowQueryCulture"] = "true"
        };

        // Program.cs constrói o WebApplicationBuilder e chama Configure(builder) antes de builder.Build(),
        // aplicando AddJsonFile("appsettings.json") seguido de AddEnvironmentVariables().
        // Definir as variáveis de ambiente antes do startup garante que o container DI receba as
        // configurações de teste (INMEMORY, SkipInitialization e Secret >= 64 bytes) na inicialização.
        ApplyEnvironmentVariables(testSettings);

        foreach (var (key, value) in testSettings)
        {
            builder.UseSetting(key, value);
        }

        builder.ConfigureAppConfiguration((_, configBuilder) =>
        {
            configBuilder.AddInMemoryCollection(testSettings);
        });

        builder.ConfigureServices(services =>
        {
            // Garante isolamento real do banco em memória por instância de factory,
            // mesmo quando DatabaseExtensions utiliza nome fixo para INMEMORY.
            services.RemoveAll<DbContextOptions<KinkConsentManagerDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<KinkConsentManagerDbContext>();
            services.RemoveAll<DbContext>();

            services.AddConfiguredDbContext<KinkConsentManagerDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName));
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            foreach (var (envKey, previousValue) in _previousEnvironmentValues)
            {
                Environment.SetEnvironmentVariable(envKey, previousValue);
            }

            _previousEnvironmentValues.Clear();
        }

        base.Dispose(disposing);
    }

    private void ApplyEnvironmentVariables(Dictionary<string, string?> testSettings)
    {
        var envOverrides = new Dictionary<string, string?>(testSettings.Count + 1)
        {
            ["ASPNETCORE_ENVIRONMENT"] = "Testing"
        };

        foreach (var (key, value) in testSettings)
        {
            envOverrides[key.Replace(":", "__", StringComparison.Ordinal)] = value;
        }

        foreach (var (envKey, value) in envOverrides)
        {
            if (!_previousEnvironmentValues.ContainsKey(envKey))
            {
                _previousEnvironmentValues[envKey] = Environment.GetEnvironmentVariable(envKey);
            }

            Environment.SetEnvironmentVariable(envKey, value);
        }
    }
}
