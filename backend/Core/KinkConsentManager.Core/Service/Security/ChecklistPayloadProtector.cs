using System.Text;
using System.Text.Json;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using SmartCoreHub.Core.SDK.Domain.Enums;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Compression;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Security;

namespace KinkConsentManager.Core.Service.Security;

/// <summary>
/// Serviço responsável por comprimir (Zstandard) e criptografar (AES-256-GCM) o JSON de respostas do checklist
/// utilizando os adaptadores oficiais do <c>SmartCoreHub.Core.SDK</c>.
/// Armazena apenas o payload Base64 como string JSON escalar (<c>"&lt;base64&gt;"</c>), mantendo compatibilidade
/// nativa com a coluna <c>jsonb</c> do PostgreSQL sem metadados extras e preservando leitura de registros legados.
/// </summary>
public sealed class ChecklistPayloadProtector : IChecklistPayloadProtector
{
    private readonly ICryptoService _cryptoService;
    private readonly ICompressionService _compressionService;
    private readonly ChecklistPayloadProtectionOptions _options;
    private readonly string? _configuredKey;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="ChecklistPayloadProtector"/>.
    /// </summary>
    /// <param name="cryptoService">Serviço de criptografia do <c>SmartCoreHub.Core.SDK</c>.</param>
    /// <param name="compressionService">Serviço de compressão do <c>SmartCoreHub.Core.SDK</c>.</param>
    /// <param name="options">Opções de proteção de payload da seção <c>ChecklistProtection</c>.</param>
    /// <param name="configuration">Configuração da aplicação contendo <c>SecuritySettings</c>.</param>
    public ChecklistPayloadProtector(
        ICryptoService cryptoService,
        ICompressionService compressionService,
        IOptions<ChecklistPayloadProtectionOptions> options,
        IConfiguration configuration)
    {
        _cryptoService = cryptoService ?? throw new ArgumentNullException(nameof(cryptoService));
        _compressionService = compressionService ?? throw new ArgumentNullException(nameof(compressionService));
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(configuration);

        _options = options.Value ?? new ChecklistPayloadProtectionOptions();
        _configuredKey = ResolveConfiguredKey(configuration);
    }

    /// <inheritdoc />
    public string Protect(string plainAnswersJson)
    {
        ArgumentNullException.ThrowIfNull(plainAnswersJson);

        var shouldCompress = _options.EnableCompress && _options.CompressionAlgorithm != ECompressionType.None;
        var shouldEncrypt = _options.EnableCryptography && _options.CryptoAlgorithm != ECryptoServiceType.None;

        if (!shouldCompress && !shouldEncrypt)
        {
            return plainAnswersJson;
        }

        // Compress-then-Encrypt: Zstd reduz o volume do JSON repetitivo antes da cifragem autenticada AES-GCM.
        var payloadBytes = Encoding.UTF8.GetBytes(plainAnswersJson);
        if (shouldCompress)
        {
            payloadBytes = _compressionService.Compress(
                payloadBytes,
                _options.CompressionAlgorithm,
                _options.CompressionLevel);
        }

        if (shouldEncrypt)
        {
            EnsureKeyConfigured();
            payloadBytes = _cryptoService.EncryptBytes(
                payloadBytes,
                _configuredKey,
                _options.CryptoAlgorithm);
        }

        // Serializa apenas o payload Base64 como string JSON escalar ("<base64>"), válido para coluna jsonb sem metadados.
        return JsonSerializer.Serialize(Convert.ToBase64String(payloadBytes));
    }

    /// <inheritdoc />
    public string Unprotect(string storedAnswersJson)
    {
        ArgumentNullException.ThrowIfNull(storedAnswersJson);

        var trimmed = storedAnswersJson.Trim();
        if (string.IsNullOrEmpty(trimmed) || trimmed[0] == '{')
        {
            // Compatibilidade retroativa com registros legados gravados em JSON plano.
            return storedAnswersJson;
        }

        var base64Payload = trimmed[0] == '"'
            ? JsonSerializer.Deserialize<string>(trimmed)
              ?? throw new InvalidOperationException("Stored checklist payload string cannot be null.")
            : trimmed;

        var payloadBytes = Convert.FromBase64String(base64Payload);

        var shouldEncrypt = _options.EnableCryptography && _options.CryptoAlgorithm != ECryptoServiceType.None;
        var shouldCompress = _options.EnableCompress && _options.CompressionAlgorithm != ECompressionType.None;

        if (shouldEncrypt)
        {
            EnsureKeyConfigured();
            payloadBytes = _cryptoService.DecryptBytes(
                payloadBytes,
                _configuredKey,
                _options.CryptoAlgorithm);
        }

        if (shouldCompress)
        {
            payloadBytes = _compressionService.Decompress(payloadBytes, _options.CompressionAlgorithm);
        }

        return Encoding.UTF8.GetString(payloadBytes);
    }

    /// <summary>
    /// Resolve a chave criptográfica configurada nas seções padrão do <c>SmartCoreHub.Core.SDK</c>.
    /// </summary>
    /// <param name="configuration">Configuração da aplicação.</param>
    /// <returns>Chave configurada ou <c>null</c> quando ausente.</returns>
    public static string? ResolveConfiguredKey(IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var candidates = new[]
        {
            configuration["SecuritySettings:AesGcmSettings:Key"],
            configuration["SecuritySettings:AesGcmKey"],
            configuration["SecuritySettings:AesSettings:Key"],
            configuration["SecuritySettings:AesKey"]
        };

        return candidates.FirstOrDefault(static value => !string.IsNullOrWhiteSpace(value))?.Trim();
    }

    private void EnsureKeyConfigured()
    {
        if (string.IsNullOrWhiteSpace(_configuredKey))
        {
            throw new InvalidOperationException(
                "SecuritySettings:AesGcmSettings:Key is missing or empty. Configure SecuritySettings__AesGcmSettings__Key before protecting or reading encrypted checklists.");
        }
    }
}
