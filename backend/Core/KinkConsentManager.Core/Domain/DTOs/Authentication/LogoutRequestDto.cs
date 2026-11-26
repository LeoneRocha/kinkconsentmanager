namespace KinkConsentManager.Core.Domain.DTOs.Authentication;

/// <summary>Requisição de encerramento de sessão.</summary>
/// <param name="RefreshToken">Refresh token atual a revogar (opcional quando <paramref name="RevokeAllSessions"/> for <c>true</c>).</param>
/// <param name="RevokeAllSessions">Quando <c>true</c>, revoga todas as sessões ativas do usuário autenticado.</param>
public sealed record LogoutRequestDto(
    string? RefreshToken,
    bool RevokeAllSessions = false
);
