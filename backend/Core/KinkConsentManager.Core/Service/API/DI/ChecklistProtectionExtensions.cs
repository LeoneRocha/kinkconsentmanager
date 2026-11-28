using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Service.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartCoreHub.Core.SDK.Domain.Enums;
using SmartCoreHub.Core.SDK.Service.Compression.DI;
using SmartCoreHub.Core.SDK.Service.DependenciesCollection.Extensions;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Registro de criptografia (AES-GCM) e compressão (Zstandard) do <c>SmartCoreHub.Core.SDK</c>
/// para proteção em repouso dos checklists salvos em <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
public static class ChecklistProtectionExtensions
{
    /// <summary>
    /// Registra os serviços de criptografia (<c>AddCoreCrypto</c>) e compressão (<c>AddCompressionServices</c>) do SDK,
    /// vincula a seção <c>ChecklistProtection</c> e valida antecipadamente a presença da chave AES-GCM quando habilitada.
    /// </summary>
    /// <param name="services">Coleção de serviços da aplicação.</param>
    /// <param name="configuration">Configuração da aplicação contendo <c>SecuritySettings</c> e <c>ChecklistProtection</c>.</param>
    /// <returns>A mesma coleção de serviços para encadeamento.</returns>
    /// <exception cref="InvalidOperationException">
    /// Lançada quando <c>ChecklistProtection:Enabled</c> está ativo com criptografia habilitada, porém nenhuma chave foi configurada em <c>SecuritySettings:AesGcmSettings:Key</c>.
    /// </exception>
    public static IServiceCollection AddChecklistPayloadProtection(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var section = configuration.GetSection(ChecklistPayloadProtectionOptions.SectionName);
        services.Configure<ChecklistPayloadProtectionOptions>(section);

        var options = section.Get<ChecklistPayloadProtectionOptions>() ?? new ChecklistPayloadProtectionOptions();
        if (options.Enabled && options.CryptoAlgorithm != ECryptoServiceType.None)
        {
            var configuredKey = ChecklistPayloadProtector.ResolveConfiguredKey(configuration);
            if (string.IsNullOrWhiteSpace(configuredKey))
            {
                throw new InvalidOperationException(
                    "SecuritySettings:AesGcmSettings:Key is missing or empty. Set the App Setting / environment variable SecuritySettings__AesGcmSettings__Key when ChecklistProtection is enabled.");
            }
        }

        services.AddCoreCrypto();
        services.AddCompressionServices();
        services.AddSingleton<IChecklistPayloadProtector, ChecklistPayloadProtector>();

        return services;
    }
}
