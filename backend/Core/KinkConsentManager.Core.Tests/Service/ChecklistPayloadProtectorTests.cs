using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Service.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.Enums;
using SmartCoreHub.Core.SDK.Domain.Helpers.Security;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Compression;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Security;
using SmartCoreHub.Core.SDK.Service.Compression.DI;
using SmartCoreHub.Core.SDK.Service.DependenciesCollection.Extensions;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class ChecklistPayloadProtectorTests
{
    private ServiceProvider _serviceProvider = null!;
    private IConfiguration _configuration = null!;
    private string _testKey = null!;

    [SetUp]
    public void SetUp()
    {
        _testKey = AesKeyGeneratorHelper.GenerateKey();
        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SecuritySettings:CryptoType"] = "AesGcm",
                ["SecuritySettings:AesGcmSettings:Key"] = _testKey
            })
            .Build();

        var services = new ServiceCollection();
        services.AddSingleton(_configuration);
        services.AddCoreCrypto();
        services.AddCompressionServices();
        _serviceProvider = services.BuildServiceProvider();
    }

    [TearDown]
    public void TearDown()
    {
        _serviceProvider.Dispose();
    }

    [Test]
    public void ProtectAndUnprotect_WithAesGcmAndZstd_ShouldRoundTripAndStoreOnlyBase64PayloadString()
    {
        // Cenário: Proteção padrão com compressão Zstandard + criptografia autenticada AES-GCM sobre respostas com acentuação UTF-8.
        // Objetivo: Garantir que apenas o payload Base64 (string JSON escalar compatível com jsonb, sem envelope de metadados) seja gravado e recuperado fielmente.
        var protector = CreateProtector();
        const string plainJson = "{\"item_bondage\":{\"primaryScale\":\"enjoy\",\"notes\":\"Ação segura e consensual\"}}";

        var protectedJson = protector.Protect(plainJson);
        var restoredJson = protector.Unprotect(protectedJson);

        using var parsed = JsonDocument.Parse(protectedJson);
        parsed.RootElement.ValueKind.Should().Be(JsonValueKind.String);
        var rawBase64 = parsed.RootElement.GetString();
        rawBase64.Should().NotBeNullOrWhiteSpace();
        Convert.FromBase64String(rawBase64!).Length.Should().BeGreaterThan(28);
        protectedJson.Should().NotContain("__kcmProtected");
        protectedJson.Should().NotContain("AesGcm");
        protectedJson.Should().NotContain("Zstd");
        protectedJson.Should().NotContain("item_bondage");
        protectedJson.Should().NotContain("Ação segura");
        restoredJson.Should().Be(plainJson);
    }

    [Test]
    public void Protect_CalledTwiceOnSamePayload_ShouldProduceDifferentCiphertextsDueToRandomNonce()
    {
        // Cenário: Duas chamadas consecutivas de Protect sobre o mesmo JSON de checklist.
        // Objetivo: Garantir que cada salvamento gere nonce aleatório distinto no AES-GCM.
        var protector = CreateProtector();
        const string plainJson = "{\"item_rope\":{\"primaryScale\":\"love\"}}";

        var first = protector.Protect(plainJson);
        var second = protector.Protect(plainJson);

        first.Should().NotBe(second);
        protector.Unprotect(first).Should().Be(plainJson);
        protector.Unprotect(second).Should().Be(plainJson);
    }

    [Test]
    public void Protect_WithLargeRepetitiveChecklist_ShouldCompressSignificantlyUsingZstd()
    {
        // Cenário: Checklist extenso com centenas de itens repetitivos (cenário real de um questionário completo).
        // Objetivo: Comprovar que a compressão Zstandard antes do AES-GCM reduz drasticamente o tamanho armazenado.
        var protector = CreateProtector();
        var entries = Enumerable.Range(1, 200)
            .Select(i => $"\"item_{i:D3}\":{{\"primaryScale\":\"enjoy\",\"secondaryScale\":\"curious\",\"notes\":\"preferencia_{i % 5}\"}}");
        var largeJson = "{" + string.Join(",", entries) + "}";

        var protectedJson = protector.Protect(largeJson);

        Encoding.UTF8.GetByteCount(protectedJson).Should().BeLessThan(Encoding.UTF8.GetByteCount(largeJson) / 2);
        protector.Unprotect(protectedJson).Should().Be(largeJson);
    }

    [Test]
    public void Unprotect_WhenCiphertextIsTampered_ShouldThrowCryptographicException()
    {
        // Cenário: Payload Base64 AES-GCM adulterado em repouso no banco de dados.
        // Objetivo: Garantir detecção de adulteração pela tag AEAD do AES-GCM.
        var protector = CreateProtector();
        var protectedJson = protector.Protect("{\"item_1\":{\"primaryScale\":\"limit\"}}");

        var rawPayload = Convert.FromBase64String(JsonSerializer.Deserialize<string>(protectedJson)!);
        rawPayload[^1] ^= 0xFF;
        var tamperedJson = JsonSerializer.Serialize(Convert.ToBase64String(rawPayload));

        var act = () => protector.Unprotect(tamperedJson);

        act.Should().Throw<CryptographicException>();
    }

    [Test]
    public void Unprotect_WhenStoredValueIsLegacyPlaintextJson_ShouldReturnOriginalJsonTransparently()
    {
        // Cenário: Registro legado já existente no banco de dados sem envelope criptografado.
        // Objetivo: Permitir leitura retrocompatível sem quebrar usuários que salvaram antes da ativação.
        var protector = CreateProtector();
        const string legacyJson = "{\"item_legacy\":{\"primaryScale\":\"curious\"}}";

        var result = protector.Unprotect(legacyJson);

        result.Should().Be(legacyJson);
    }

    [Test]
    public void ProtectAndUnprotect_WhenOnlyCompressEnabled_ShouldCompressWithoutEncrypting()
    {
        // Cenário: Apenas EnableCompress=true e EnableCryptography=false.
        // Objetivo: Permitir compressão Zstd isolada sem exigir ou aplicar criptografia.
        var protector = CreateProtector(new ChecklistPayloadProtectionOptions
        {
            EnableCompress = true,
            EnableCryptography = false,
            CompressionAlgorithm = ECompressionType.Zstd,
            CompressionLevel = CompressionLevel.Optimal
        });
        const string plainJson = "{\"item_1\":{\"primaryScale\":\"enjoy\"}}";

        var protectedJson = protector.Protect(plainJson);
        var restoredJson = protector.Unprotect(protectedJson);

        using var parsed = JsonDocument.Parse(protectedJson);
        parsed.RootElement.ValueKind.Should().Be(JsonValueKind.String);
        restoredJson.Should().Be(plainJson);
    }

    [Test]
    public void ProtectAndUnprotect_WhenOnlyCryptographyEnabled_ShouldEncryptWithoutCompressing()
    {
        // Cenário: Apenas EnableCryptography=true e EnableCompress=false.
        // Objetivo: Permitir criptografia AES-GCM isolada sem compressão Zstd.
        var protector = CreateProtector(new ChecklistPayloadProtectionOptions
        {
            EnableCompress = false,
            EnableCryptography = true,
            CryptoAlgorithm = ECryptoServiceType.AesGcm
        });
        const string plainJson = "{\"item_1\":{\"primaryScale\":\"enjoy\"}}";

        var protectedJson = protector.Protect(plainJson);
        var restoredJson = protector.Unprotect(protectedJson);

        using var parsed = JsonDocument.Parse(protectedJson);
        parsed.RootElement.ValueKind.Should().Be(JsonValueKind.String);
        protectedJson.Should().NotContain("item_1");
        restoredJson.Should().Be(plainJson);
    }

    [Test]
    public void Protect_WhenBothDisabledInOptions_ShouldReturnPlaintextUnchanged()
    {
        // Cenário: EnableCompress=false e EnableCryptography=false.
        // Objetivo: Respeitar a configuração modular mantendo pass-through sem erro.
        var protector = CreateProtector(new ChecklistPayloadProtectionOptions
        {
            EnableCompress = false,
            EnableCryptography = false
        });
        const string plainJson = "{\"item_1\":{\"primaryScale\":\"enjoy\"}}";

        var result = protector.Protect(plainJson);

        result.Should().Be(plainJson);
    }

    private ChecklistPayloadProtector CreateProtector(ChecklistPayloadProtectionOptions? options = null)
    {
        return new ChecklistPayloadProtector(
            _serviceProvider.GetRequiredService<ICryptoService>(),
            _serviceProvider.GetRequiredService<ICompressionService>(),
            Options.Create(options ?? new ChecklistPayloadProtectionOptions
            {
                EnableCompress = true,
                EnableCryptography = true,
                CryptoAlgorithm = ECryptoServiceType.AesGcm,
                CompressionAlgorithm = ECompressionType.Zstd,
                CompressionLevel = CompressionLevel.Optimal
            }),
            _configuration);
    }
}
