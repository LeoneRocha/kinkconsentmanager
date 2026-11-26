namespace KinkConsentManager.Core.Domain.Localization.MessageKeys;

/// <summary>
/// Catálogo único de chaves canônicas para todos os validadores do domínio.
/// Chaves iniciadas por 'SmartCoreHub.Core.SDK.' usam diretamente os recursos nativos do SDK.
/// </summary>
public static class ValidationMessageKeys
{
    /// <summary>Campo obrigatório.</summary>
    public const string RequiredField = "SmartCoreHub.Core.SDK.Validation.RequiredField";

    /// <summary>Formato de e-mail inválido.</summary>
    public const string InvalidEmail = "SmartCoreHub.Core.SDK.Validation.InvalidEmail";

    /// <summary>Comprimento mínimo não atingido.</summary>
    public const string MinimumLength = "SmartCoreHub.Core.SDK.Validation.MinimumLength";

    /// <summary>Comprimento máximo excedido.</summary>
    public const string MaximumLength = "SmartCoreHub.Core.SDK.Validation.MaximumLength";

    /// <summary>Senhas não conferem.</summary>
    public const string PasswordsDoNotMatch = "SmartCoreHub.Core.SDK.Validation.PasswordsDoNotMatch";

    /// <summary>Formato inválido.</summary>
    public const string InvalidFormat = "SmartCoreHub.Core.SDK.Validation.InvalidFormat";

    /// <summary>Falha genérica de validação.</summary>
    public const string Failed = "SmartCoreHub.Core.SDK.Validation.Failed";

    /// <summary>Senha não pode conter espaços em branco.</summary>
    public const string PasswordNoWhitespace = "Validation.Password.NoWhitespace";

    /// <summary>Senha requer pelo menos uma letra maiúscula.</summary>
    public const string PasswordUppercaseRequired = "Validation.Password.UppercaseRequired";

    /// <summary>Senha requer pelo menos uma letra minúscula.</summary>
    public const string PasswordLowercaseRequired = "Validation.Password.LowercaseRequired";

    /// <summary>Senha requer pelo menos um número.</summary>
    public const string PasswordDigitRequired = "Validation.Password.DigitRequired";

    /// <summary>Senha requer pelo menos um caractere especial.</summary>
    public const string PasswordSpecialCharRequired = "Validation.Password.SpecialCharRequired";

    /// <summary>Login possui caracteres inválidos.</summary>
    public const string LoginInvalidCharacters = "Validation.Login.InvalidCharacters";

    /// <summary>Refresh token inválido.</summary>
    public const string RefreshTokenInvalid = "Validation.RefreshToken.Invalid";

    /// <summary>Payload JSON do checklist inválido.</summary>
    public const string ReportInvalidJson = "Validation.Report.InvalidJson";
}
