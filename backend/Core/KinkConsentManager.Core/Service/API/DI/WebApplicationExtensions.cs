using System.Diagnostics.CodeAnalysis;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SmartCoreHub.Core.SDK.Service.API.DI.Documentation.Options;
using SmartCoreHub.Core.SDK.Service.API.DI.Health.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Hosting.Extensions;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Configura o pipeline HTTP, os endpoints, a documentação OpenAPI e a inicialização do banco de dados da aplicação.
/// </summary>
[ExcludeFromCodeCoverage]
public static class WebApplicationExtensions
{
    /// <summary>
    /// Monta o pipeline HTTP padrão do <c>SmartCoreHub.Core.SDK</c> com branding do <c>KinkConsentManager</c>,
    /// autenticação/autorização, liveness/readiness e inicialização de migrations no startup.
    /// </summary>
    /// <param name="app">Aplicação web cujo pipeline será configurado.</param>
    public static void ConfigurePipeline(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.UseSdkNetworkAndCrossCutting();

        var docs = app.Services.GetService<OpenApiDocumentationOptions>()
            ?? KinkConsentManagerDocumentationOptions.Branding.CreateDocumentation(app.Configuration);
        app.UseSdkCorsAndDocumentation(docs, KinkConsentManagerDocumentationOptions.Branding.CreateCors());

        app.UseSdkSecurityAndEndpoints<KinkConsentManagerDbContext>();
        app.InitializeDatabaseAtStartup<KinkConsentManagerDbContext>();
        app.UseSdkRequestLogging();
    }
}
