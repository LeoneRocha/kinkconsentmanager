namespace KinkConsentManager.Core.Domain.DTOs.Authentication;

/// <summary>Dados públicos resumidos do usuário autenticado.</summary>
/// <param name="Id">Identificador numérico único do usuário.</param>
/// <param name="Name">Nome ou pseudônimo de exibição.</param>
/// <param name="Login">Identificador único de login.</param>
/// <param name="Email">Endereço de e-mail normalizado.</param>
/// <param name="IsActive">Indica se a conta está ativa.</param>
/// <param name="CreatedAt">Data de criação em UTC.</param>
/// <param name="LastLoginAt">Data do último login em UTC, quando houver.</param>
public sealed record UserKinkDto(
    long Id,
    string Name,
    string Login,
    string Email,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);
