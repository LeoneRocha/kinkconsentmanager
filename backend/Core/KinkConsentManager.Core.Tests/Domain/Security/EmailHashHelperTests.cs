using KinkConsentManager.Core.Domain.Security;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Tests.Domain.Security;

[TestFixture]
public sealed class EmailHashHelperTests
{
    [Test]
    public void ComputeHash_WhenEmailVariesInCaseOrWhitespace_ShouldReturnSameDeterministicSha256()
    {
        // Cenário: Cálculo de hash para o mesmo e-mail informado com capitalizações e espaços distintos.
        // Objetivo: Garantir que ComputeHash normalize para minúsculas e gere exatamente 64 caracteres hexadecimais determinísticos.
        var fromVo = EmailHashHelper.ComputeHash(new Email("Alex.Silva@Example.COM"));
        var fromRawLower = EmailHashHelper.ComputeHash("alex.silva@example.com");
        var fromRawUpperWithSpaces = EmailHashHelper.ComputeHash("  ALEX.SILVA@EXAMPLE.COM  ");

        fromVo.Should().Be(fromRawLower);
        fromRawUpperWithSpaces.Should().Be(fromRawLower);
        fromRawLower.Should().MatchRegex("^[0-9A-F]{64}$");
    }

    [Test]
    public void ComputeHash_WhenEmailsDiffer_ShouldProduceDistinctHashes()
    {
        // Cenário: Dois endereços de e-mail distintos.
        // Objetivo: Garantir resistência a colisões com hashes completamente diferentes.
        var hash1 = EmailHashHelper.ComputeHash("user1@example.com");
        var hash2 = EmailHashHelper.ComputeHash("user2@example.com");

        hash1.Should().NotBe(hash2);
    }

    [Test]
    public void VerifyEmail_ShouldMatchValidEmailIgnoringCaseAndRejectWrongOrMalformedEmails()
    {
        // Cenário: Verificação em tempo constante de e-mail válido, e-mail diferente e entradas inválidas.
        // Objetivo: Garantir proteção LGPD com verificação segura para login/auditoria sem armazenar e-mail em texto plano.
        var storedHash = EmailHashHelper.ComputeHash("alex.silva@example.com");

        EmailHashHelper.VerifyEmail("ALEX.SILVA@example.com", storedHash).Should().BeTrue();
        EmailHashHelper.VerifyEmail("alex.silva@example.com", storedHash.ToLowerInvariant()).Should().BeTrue();
        EmailHashHelper.VerifyEmail("outro@example.com", storedHash).Should().BeFalse();
        EmailHashHelper.VerifyEmail("invalido", storedHash).Should().BeFalse();
        EmailHashHelper.VerifyEmail("", storedHash).Should().BeFalse();
        EmailHashHelper.VerifyEmail("alex.silva@example.com", "").Should().BeFalse();
    }
}
