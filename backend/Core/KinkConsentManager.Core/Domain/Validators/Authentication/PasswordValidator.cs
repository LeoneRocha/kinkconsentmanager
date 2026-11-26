using FluentValidation;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador centralizado de complexidade de senha com suporte a resources e múltiplos idiomas via <see cref="IValidationMessageService"/>.
/// </summary>
public sealed class PasswordValidator : AbstractValidator<string>
{
    /// <summary>Inicializa as regras de senha forte com resolução dinâmica por cultura.</summary>
    /// <param name="messages">Serviço centralizado de localização de mensagens de validação.</param>
    public PasswordValidator(IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Password"))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule1")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MinimumLength(8)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MinimumLength, "{PropertyName} must be at least {MinLength} characters.", "Password", 8))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule2")
                .WithMessageKey(ValidationMessageKeys.MinimumLength)
            .MaximumLength(100)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "Password", 100))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule3")
                .WithMessageKey(ValidationMessageKeys.MaximumLength)
            .Must(p => string.IsNullOrEmpty(p) || !p.Any(char.IsWhiteSpace))
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordNoWhitespace, "Password cannot contain whitespace."))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule4")
                .WithMessageKey(ValidationMessageKeys.PasswordNoWhitespace)
            .Matches(@"[A-Z]")
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordUppercaseRequired, "Password must contain at least one uppercase letter."))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule5")
                .WithMessageKey(ValidationMessageKeys.PasswordUppercaseRequired)
            .Matches(@"[a-z]")
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordLowercaseRequired, "Password must contain at least one lowercase letter."))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule6")
                .WithMessageKey(ValidationMessageKeys.PasswordLowercaseRequired)
            .Matches(@"[0-9]")
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordDigitRequired, "Password must contain at least one number."))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule7")
                .WithMessageKey(ValidationMessageKeys.PasswordDigitRequired)
            .Matches(@"[!@#$%^&*()_+\-=\[\]{}|;':"",.<>?/]")
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordSpecialCharRequired, "Password must contain at least one special character."))
                .WithErrorCode("KinkConsentManager.Domain.PasswordValidator.Rule8")
                .WithMessageKey(ValidationMessageKeys.PasswordSpecialCharRequired);
    }
}
