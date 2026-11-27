using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using KinkConsentManager.Core.Domain.Entities;
using SmartCoreHub.Core.SDK.Domain.Security;
using SmartCoreHub.Core.SDK.Infrastructure.Security;
using SmartCoreHub.Core.SDK.Service.Security;

namespace KinkConsentManager.Core.Service.Security;

/// <summary>
/// Contrato de emissão de tokens JWT HS512, geração segura de refresh tokens e validação de acesso.
/// </summary>
public interface IJwtTokenService
{
    /// <summary>
    /// Gera um Access Token JWT assinado com HS512 contendo as claims padrão sem exposição de e-mail (LGPD) e a claim <c>login</c>.
    /// </summary>
    /// <param name="user">Entidade do usuário autenticado.</param>
    /// <returns>Token JWT serializado.</returns>
    string GenerateAccessToken(UserKink user);

    /// <summary>
    /// Gera um par de refresh token opaco criptograficamente aleatório e seu respectivo hash SHA-256 hexadecimal.
    /// </summary>
    /// <returns>Tupla contendo o token bruto em Base64Url e o digest SHA-256 em hexadecimal.</returns>
    (string RawToken, string TokenHash) GenerateSecureRefreshToken();

    /// <summary>
    /// Calcula o hash SHA-256 em formato hexadecimal para o refresh token informado.
    /// </summary>
    /// <param name="rawToken">Refresh token bruto.</param>
    /// <returns>Representação hexadecimal em maiúsculas do hash SHA-256.</returns>
    string ComputeTokenHash(string rawToken);

    /// <summary>
    /// Valida o token JWT informado e extrai o identificador numérico do usuário autenticado.
    /// </summary>
    /// <param name="token">Token JWT Bearer.</param>
    /// <param name="userId">Identificador do usuário extraído quando o token é válido.</param>
    /// <returns><c>true</c> quando o token é válido e contém <c>nameid</c> numérico; caso contrário, <c>false</c>.</returns>
    bool ValidateToken(string token, out long? userId);
}

/// <summary>
/// Implementação de segurança JWT sobre <see cref="IJwtAccessTokenService"/> do <c>SmartCoreHub.Core.SDK</c>.
/// </summary>
public sealed class JwtTokenService : IJwtTokenService
{
    private readonly IJwtAccessTokenService _accessTokens;
    private readonly ISecurityTokenAdapterFactory? _tokenAdapterFactory;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="JwtTokenService"/>.
    /// </summary>
    /// <param name="accessTokens">Serviço de emissão e validação JWT do <c>SmartCoreHub.Core.SDK</c>.</param>
    /// <param name="tokenAdapterFactory">Fábrica opcional de adaptadores JWT usada como fallback compatível com <c>ClaimTypes.NameIdentifier</c>.</param>
    public JwtTokenService(
        IJwtAccessTokenService accessTokens,
        ISecurityTokenAdapterFactory? tokenAdapterFactory = null)
    {
        _accessTokens = accessTokens ?? throw new ArgumentNullException(nameof(accessTokens));
        _tokenAdapterFactory = tokenAdapterFactory;
    }

    /// <inheritdoc />
    public string GenerateAccessToken(UserKink user)
    {
        ArgumentNullException.ThrowIfNull(user);

        var claims = JwtAccessTokenService
            .BuildStandardAccessClaims(user.Id, user.Login, string.Empty)
            .Where(c =>
                !string.Equals(c.Type, JwtRegisteredClaimNames.Email, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(c.Type, ClaimTypes.Email, StringComparison.OrdinalIgnoreCase))
            .ToList();
        claims.Add(new Claim("login", user.Login));

        return _accessTokens.GenerateAccessToken(claims);
    }

    /// <inheritdoc />
    public (string RawToken, string TokenHash) GenerateSecureRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var rawToken = Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        return (rawToken, ComputeTokenHash(rawToken));
    }

    /// <inheritdoc />
    public string ComputeTokenHash(string rawToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rawToken);

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hashBytes);
    }

    /// <inheritdoc />
    public bool ValidateToken(string token, out long? userId)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            userId = null;
            return false;
        }

        if (_accessTokens.TryGetUserId(token, out userId))
        {
            return true;
        }

        if (_tokenAdapterFactory is not null)
        {
            var principal = _tokenAdapterFactory.Create().ValidateToken(token);
            userId = UserClaimsHelper.TryGetUserId(principal);
            return userId.HasValue;
        }

        userId = null;
        return false;
    }
}
