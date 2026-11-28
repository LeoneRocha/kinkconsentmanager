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
    public void ProtectAndUnprotect_WithAesGcmAndZstd_ShouldRoundTripAndHidePlaintextInValidJsonbEnvelope()
    {
        // Cenário: Proteção padrão com compressão Zstandard + criptografia autenticada AES-GCM sobre respostas com acentuação UTF-8.
        // Objetivo: Garantir envelope JSON válido (compatível com jsonb), ocultação total das respostas em repouso e recuperação exata.
        var protector = CreateProtector();
        const string plainJson = "{\"item_bondage\":{\"primaryScale\":\"enjoy\",\"notes\":\"Ação segura e consensual\"}}";

        var protectedJson = protector.Protect(plainJson);
        var restoredJson = protector.Unprotect(protectedJson);

        using var parsed = JsonDocument.Parse(protectedJson);
        parsed.RootElement.GetProperty("__kcmProtected").GetBoolean().Should().BeTrue();
        parsed.RootElement.GetProperty("v").GetInt32().Should().Be(1);
        parsed.RootElement.GetProperty("alg").GetString().Should().Be("AesGcm");
        parsed.RootElement.GetProperty("cmp").GetString().Should().Be("Zstd");
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
        // Cenário: Envelope AES-GCM adulterado em repouso no banco de dados.
        // Objetivo: Garantir detecção de adulteração pela tag AEAD do AES-GCM.
        var protector = CreateProtector();
        var protectedJson = protector.Protect("{\"item_1\":{\"primaryScale\":\"limit\"}}");

        using var doc = JsonDocument.Parse(protectedJson);
        var rawPayload = Convert.FromBase64String(doc.RootElement.GetProperty("payload").GetString()!);
        rawPayload[^1] ^= 0xFF;
        var tamperedJson = JsonSerializer.Serialize(new
        {
            __kcmProtected = true,
            v = 1,
            alg = "AesGcm",
            cmp = "Zstd",
            payload = Convert.ToBase64String(rawPayload)
        });

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
    public void Protect_WhenDisabledInOptions_ShouldReturnPlaintextUnchanged()
    {
        // Cenário: ChecklistProtection:Enabled configurado como false.
        // Objetivo: Respeitar a configuração do appsettings mantendo pass-through sem erro.
        var protector = CreateProtector(new ChecklistPayloadProtectionOptions { Enabled = false });
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
                Enabled = true,
                CryptoAlgorithm = ECryptoServiceType.AesGcm,
                CompressionAlgorithm = ECompressionType.Zstd,
                CompressionLevel = CompressionLevel.Optimal
            }),
            _configuration);
    }
}
