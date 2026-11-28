using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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
/// utilizando os adaptadores oficiais do <c>SmartCoreHub.Core.SDK</c>, mantendo compatibilidade com a coluna
/// <c>jsonb</c> do PostgreSQL e leitura transparente de registros legados em texto claro.
/// </summary>
public sealed class ChecklistPayloadProtector : IChecklistPayloadProtector
{
    private const int CurrentEnvelopeVersion = 1;

    private static readonly JsonSerializerOptions EnvelopeJsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

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

        if (!_options.Enabled ||
            (_options.CryptoAlgorithm == ECryptoServiceType.None &&
             _options.CompressionAlgorithm == ECompressionType.None))
        {
            return plainAnswersJson;
        }

        // Compress-then-Encrypt: Zstd reduz o volume do JSON repetitivo antes da cifragem autenticada AES-GCM.
        var plainBytes = Encoding.UTF8.GetBytes(plainAnswersJson);
        var compressedBytes = _options.CompressionAlgorithm == ECompressionType.None
            ? plainBytes
            : _compressionService.Compress(plainBytes, _options.CompressionAlgorithm, _options.CompressionLevel);

        byte[] protectedBytes;
        if (_options.CryptoAlgorithm == ECryptoServiceType.None)
        {
            protectedBytes = compressedBytes;
        }
        else
        {
            EnsureKeyConfigured();
            protectedBytes = _cryptoService.EncryptBytes(
                compressedBytes,
                _configuredKey,
                _options.CryptoAlgorithm);
        }

        var envelope = new ProtectedChecklistEnvelope(
            Protected: true,
            Version: CurrentEnvelopeVersion,
            Algorithm: _options.CryptoAlgorithm.ToString(),
            Compression: _options.CompressionAlgorithm.ToString(),
            Payload: Convert.ToBase64String(protectedBytes));

        return JsonSerializer.Serialize(envelope, EnvelopeJsonOptions);
    }

    /// <inheritdoc />
    public string Unprotect(string storedAnswersJson)
    {
        ArgumentNullException.ThrowIfNull(storedAnswersJson);

        if (!TryParseProtectedEnvelope(storedAnswersJson, out var envelope))
        {
            // Compatibilidade retroativa com registros legados gravados em JSON plano.
            return storedAnswersJson;
        }

        if (!Enum.TryParse<ECryptoServiceType>(envelope.Algorithm, ignoreCase: true, out var cryptoAlgorithm))
        {
            throw new InvalidOperationException(
                $"Unsupported checklist encryption algorithm '{envelope.Algorithm}'.");
        }

        if (!Enum.TryParse<ECompressionType>(envelope.Compression, ignoreCase: true, out var compressionAlgorithm))
        {
            throw new InvalidOperationException(
                $"Unsupported checklist compression algorithm '{envelope.Compression}'.");
        }

        var rawPayloadBytes = Convert.FromBase64String(envelope.Payload);

        byte[] decryptedBytes;
        if (cryptoAlgorithm == ECryptoServiceType.None)
        {
            decryptedBytes = rawPayloadBytes;
        }
        else
        {
            EnsureKeyConfigured();
            decryptedBytes = _cryptoService.DecryptBytes(
                rawPayloadBytes,
                _configuredKey,
                cryptoAlgorithm);
        }

        var plainBytes = compressionAlgorithm == ECompressionType.None
            ? decryptedBytes
            : _compressionService.Decompress(decryptedBytes, compressionAlgorithm);

        return Encoding.UTF8.GetString(plainBytes);
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

    private static bool TryParseProtectedEnvelope(string json, out ProtectedChecklistEnvelope envelope)
    {
        envelope = default!;

        if (string.IsNullOrWhiteSpace(json) || !json.Contains("\"__kcmProtected\"", StringComparison.Ordinal))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (!document.RootElement.TryGetProperty("__kcmProtected", out var marker) ||
                marker.ValueKind != JsonValueKind.True)
            {
                return false;
            }

            var parsed = JsonSerializer.Deserialize<ProtectedChecklistEnvelope>(json, EnvelopeJsonOptions);
            if (parsed is null || !parsed.Protected || string.IsNullOrWhiteSpace(parsed.Payload))
            {
                return false;
            }

            envelope = parsed;
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private sealed record ProtectedChecklistEnvelope(
        [property: JsonPropertyName("__kcmProtected")] bool Protected,
        [property: JsonPropertyName("v")] int Version,
        [property: JsonPropertyName("alg")] string Algorithm,
        [property: JsonPropertyName("cmp")] string Compression,
        [property: JsonPropertyName("payload")] string Payload);
}
