namespace KinkConsentManager.Core.Domain.DTOs.Authentication;

/// <summary>Dados públicos resumidos do usuário autenticado (sem exposição de nome, e-mail ou hash por LGPD).</summary>
/// <param name="Id">Identificador numérico único do usuário.</param>
/// <param name="Login">Identificador único de login.</param>
/// <param name="IsActive">Indica se a conta está ativa.</param>
/// <param name="CreatedAt">Data de criação em UTC.</param>
/// <param name="LastLoginAt">Data do último login em UTC, quando houver.</param>
public sealed record UserKinkDto(
    long Id,
    string Login,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);
