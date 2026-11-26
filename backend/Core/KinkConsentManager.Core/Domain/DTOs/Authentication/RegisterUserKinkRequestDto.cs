namespace KinkConsentManager.Core.Domain.DTOs.Authentication;

/// <summary>Dados de entrada para cadastro de novo usuário.</summary>
/// <param name="Name">Nome ou pseudônimo de exibição.</param>
/// <param name="Login">Identificador único de login.</param>
/// <param name="Email">Endereço de e-mail.</param>
/// <param name="Password">Senha em texto plano para hashing seguro.</param>
/// <param name="ConfirmPassword">Confirmação da senha.</param>
public sealed record RegisterUserKinkRequestDto(
    string Name,
    string Login,
    string Email,
    string Password,
    string ConfirmPassword
);
