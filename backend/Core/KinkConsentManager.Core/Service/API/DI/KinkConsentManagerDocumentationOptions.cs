using SmartCoreHub.Core.SDK.Service.API.DI.Documentation.Helpers;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Opções de branding do produto <c>KinkConsentManager</c> para geração de documentação OpenAPI/Swagger e política CORS.
/// </summary>
public static class KinkConsentManagerDocumentationOptions
{
    /// <summary>
    /// Definição centralizada de branding da API do <c>KinkConsentManager</c>.
    /// </summary>
    public static ApiProductBranding Branding { get; } = new()
    {
        ProductName = "KinkConsentManager",
        Description = "API de autenticação e sincronização do KinkConsentManager.",
        ContactName = "KinkConsentManager Team",
        ContactEmail = "support@kinkconsentmanager.local",
        CorsPrivatePolicyName = "AllowFrontendApp"
    };
}
