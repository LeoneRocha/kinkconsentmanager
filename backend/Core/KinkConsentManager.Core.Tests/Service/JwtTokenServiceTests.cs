using System.IdentityModel.Tokens.Jwt;
using System.Text.RegularExpressions;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Service.Security;
using Microsoft.Extensions.Configuration;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Entities;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;
using SmartCoreHub.Core.SDK.Infrastructure.Security;
using SmartCoreHub.Core.SDK.Service.Security;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class JwtTokenServiceTests
{
    private const string Valid64ByteSecret = "KinkConsentManager_Test_Signing_Secret_Key_With_At_Least_64_Bytes_1234";
    private JwtTokenService _jwtTokenService = null!;

    [SetUp]
    public void SetUp()
    {
        var tokenConfig = new TokenConfigurationDto
        {
            Secret = Valid64ByteSecret,
            Issuer = "KinkConsentManager.API",
            Audience = "KinkConsentManager.Client",
            Minutes = 60,
            DaysToExpiry = 7
        };

        var configuration = new ConfigurationBuilder().Build();
        var factory = new SecurityTokenAdapterFactory(configuration, tokenConfig);
        var accessTokens = new JwtAccessTokenService(factory);
        _jwtTokenService = new JwtTokenService(accessTokens, factory);
    }

    [Test]
    public void GenerateAccessToken_ShouldIssueHs512JwtWithExpectedStandardAndLoginClaimsWithoutEmail()
    {
        // Cenário: Emissão de Access Token JWT para um UserKink autenticado.
        // Objetivo: Verificar algoritmo HS512 no cabeçalho, presença das claims jti, nameid, unique_name e login, e ausência de e-mail ou EmailHash (LGPD).
        var user = CreateUser(id: 77, login: "Alex_Silva", email: "alex@example.com");

        var token = _jwtTokenService.GenerateAccessToken(user);

        token.Should().NotBeNullOrWhiteSpace();
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Header.Alg.Should().Be("HS512");
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Jti && !string.IsNullOrWhiteSpace(c.Value));
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.NameId && c.Value == "77");
        jwt.Claims.Should().Contain(c =>
            (c.Type == JwtRegisteredClaimNames.UniqueName || c.Type == JwtRegisteredClaimNames.Name || c.Type == "name") &&
            c.Value == "Alex_Silva");
        jwt.Claims.Should().Contain(c => c.Type == "login" && c.Value == "Alex_Silva");
        jwt.Claims.Should().NotContain(c => c.Type == JwtRegisteredClaimNames.Email || c.Value.Contains("alex@example.com", StringComparison.OrdinalIgnoreCase));
        jwt.Claims.Should().NotContain(c => c.Value == user.EmailHash);
    }

    [Test]
    public void ValidateToken_WhenTokenIsValid_ShouldReturnTrueAndExtractUserId()
    {
        // Cenário: Validação de um Access Token recém-emitido pelo próprio JwtTokenService.
        // Objetivo: Garantir que ValidateToken retorne true e extraia corretamente o identificador numérico do usuário.
        var user = CreateUser(id: 901, login: "jordan_k", email: "jordan@example.com");
        var token = _jwtTokenService.GenerateAccessToken(user);

        var isValid = _jwtTokenService.ValidateToken(token, out var userId);

        isValid.Should().BeTrue();
        userId.Should().Be(901);
    }

    [TestCase("")]
    [TestCase("   ")]
    [TestCase("invalid.jwt.token")]
    public void ValidateToken_WhenTokenIsInvalidOrEmpty_ShouldReturnFalseAndNullUserId(string candidateToken)
    {
        // Cenário: Tentativa de validar token vazio ou malformado.
        // Objetivo: Garantir que ValidateToken retorne false e userId nulo sem lançar exceções.
        var isValid = _jwtTokenService.ValidateToken(candidateToken, out var userId);

        isValid.Should().BeFalse();
        userId.Should().BeNull();
    }

    [Test]
    public void GenerateSecureRefreshToken_ShouldGenerateDistinctHighEntropyTokensWithMatchingSha256Hash()
    {
        // Cenário: Geração consecutiva de dois refresh tokens opacos via CSPRNG.
        // Objetivo: Garantir alta entropia (64 bytes -> ~86 chars Base64Url), unicidade entre gerações e hash SHA-256 consistente.
        var first = _jwtTokenService.GenerateSecureRefreshToken();
        var second = _jwtTokenService.GenerateSecureRefreshToken();

        first.RawToken.Should().NotBeNullOrWhiteSpace();
        first.RawToken.Length.Should().BeGreaterThanOrEqualTo(80);
        first.RawToken.Should().NotContain("+").And.NotContain("/").And.NotContain("=");
        second.RawToken.Should().NotBe(first.RawToken);
        second.TokenHash.Should().NotBe(first.TokenHash);

        _jwtTokenService.ComputeTokenHash(first.RawToken).Should().Be(first.TokenHash);
        _jwtTokenService.ComputeTokenHash(second.RawToken).Should().Be(second.TokenHash);
    }

    [Test]
    public void ComputeTokenHash_ShouldReturnDeterministic64CharHexSha256()
    {
        // Cenário: Cálculo de hash SHA-256 sobre o mesmo refresh token bruto duas vezes.
        // Objetivo: Validar determinismo e formato hexadecimal de 64 caracteres (256 bits).
        const string rawToken = "sample-opaque-refresh-token-value";

        var hash1 = _jwtTokenService.ComputeTokenHash(rawToken);
        var hash2 = _jwtTokenService.ComputeTokenHash(rawToken);
        var otherHash = _jwtTokenService.ComputeTokenHash(rawToken + "-other");

        hash1.Should().Be(hash2);
        hash1.Length.Should().Be(64);
        Regex.IsMatch(hash1, "^[0-9A-F]{64}$").Should().BeTrue();
        otherHash.Should().NotBe(hash1);
    }

    private static UserKink CreateUser(long id, string login, string email)
    {
        var user = new UserKink
        {
            Id = id,
            PasswordHash = "$2a$11$hash",
            IsActive = true
        };
        user.SetLogin(login);
        user.SetEmail(email);
        return user;
    }
}
