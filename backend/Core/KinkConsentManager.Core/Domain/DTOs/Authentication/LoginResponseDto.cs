namespace KinkConsentManager.Core.Domain.DTOs.Authentication;

/// <summary>Resposta da autenticação contendo AccessToken JWT, RefreshToken e perfil.</summary>
/// <param name="AccessToken">Token JWT Bearer assinado com HS512.</param>
/// <param name="RefreshToken">Refresh token opaco para renovação de sessão.</param>
/// <param name="ExpiresAtUtc">Data de expiração do AccessToken em UTC.</param>
/// <param name="RefreshTokenExpiresAtUtc">Data de expiração do RefreshToken em UTC.</param>
/// <param name="User">Dados públicos do usuário autenticado.</param>
/// <param name="TokenType">Esquema de autenticação (padrão "Bearer").</param>
public sealed record LoginResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAtUtc,
    DateTime RefreshTokenExpiresAtUtc,
    UserKinkDto User,
    string TokenType = "Bearer"
);
