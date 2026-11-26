using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartCoreHub.Core.SDK.Service.API.DI.Security.Extensions;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Registro e validação do esquema de autenticação JWT Bearer (HS512) no container de DI.
/// </summary>
public static class AuthenticationExtensions
{
    private const string BearerPolicyName = "Bearer";

    /// <summary>
    /// Configura <c>TokenConfigurations</c>, valida a chave mínima de 64 bytes para assinatura HS512,
    /// registra o esquema <see cref="JwtBearerDefaults.AuthenticationScheme"/> e a política de autorização <c>Bearer</c>.
    /// </summary>
    /// <param name="services">Coleção de serviços da aplicação.</param>
    /// <param name="configuration">Configuração da aplicação contendo a seção <c>TokenConfigurations</c>.</param>
    /// <returns>A mesma coleção de serviços para encadeamento.</returns>
    /// <exception cref="InvalidOperationException">
    /// Lançada quando <c>TokenConfigurations:Secret</c> está ausente, vazio ou possui menos de 64 bytes (512 bits).
    /// </exception>
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var tokenConfigurations = services.AddTokenConfiguration(configuration);

        // Falha cedo no startup se TokenConfigurations:Secret estiver vazio (evita IDX10703).
        TokenConfigurationServiceCollectionExtensions.EnsureSigningSecret(tokenConfigurations);

        if (Encoding.UTF8.GetByteCount(tokenConfigurations.Secret) < 64)
        {
            throw new InvalidOperationException(
                "TokenConfigurations:Secret must be at least 64 bytes (512 bits) for HS512 signing.");
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            options.TokenValidationParameters =
                TokenConfigurationServiceCollectionExtensions.CreateTokenValidationParameters(tokenConfigurations);
        });

        services.AddAuthenticatedUserPolicy(BearerPolicyName, JwtBearerDefaults.AuthenticationScheme);
        return services;
    }
}
