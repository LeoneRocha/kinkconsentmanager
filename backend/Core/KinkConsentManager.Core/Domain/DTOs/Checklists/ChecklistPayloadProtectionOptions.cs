using System.IO.Compression;
using SmartCoreHub.Core.SDK.Domain.Enums;

namespace KinkConsentManager.Core.Domain.DTOs.Checklists;

/// <summary>
/// Opções de configuração para compressão e criptografia em repouso do JSON de respostas do checklist
/// na coluna <c>AnswersJson</c> de <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
public sealed class ChecklistPayloadProtectionOptions
{
    /// <summary>
    /// Nome da seção de configuração no <c>appsettings.json</c>.
    /// </summary>
    public const string SectionName = "ChecklistProtection";

    /// <summary>
    /// Indica se a proteção (compressão + criptografia) em repouso está habilitada por padrão.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Algoritmo de criptografia do <c>SmartCoreHub.Core.SDK</c> utilizado para cifrar o payload (padrão: <see cref="ECryptoServiceType.AesGcm"/>).
    /// </summary>
    public ECryptoServiceType CryptoAlgorithm { get; set; } = ECryptoServiceType.AesGcm;

    /// <summary>
    /// Algoritmo de compressão do <c>SmartCoreHub.Core.SDK</c> aplicado antes da criptografia (padrão: <see cref="ECompressionType.Zstd"/>).
    /// </summary>
    public ECompressionType CompressionAlgorithm { get; set; } = ECompressionType.Zstd;

    /// <summary>
    /// Nível de compressão aplicado ao JSON antes da criptografia (padrão: <see cref="CompressionLevel.Optimal"/>).
    /// </summary>
    public CompressionLevel CompressionLevel { get; set; } = CompressionLevel.Optimal;
}
