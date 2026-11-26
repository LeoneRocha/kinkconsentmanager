using FluentValidation;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador do contrato de login dual (<see cref="LoginDto"/> do SmartCoreHub.Core.SDK).
/// </summary>
public sealed class LoginDtoValidator : AbstractValidator<LoginDto>
{
    /// <summary>Inicializa as regras de login com resolução dinâmica de mensagens por idioma.</summary>
    /// <param name="messages">Serviço centralizado de localização.</param>
    public LoginDtoValidator(IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x.LoginOrEmail)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "LoginOrEmail"))
                .WithErrorCode("KinkConsentManager.Domain.LoginValidator.LoginOrEmailRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MaximumLength(191)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "LoginOrEmail", 191))
                .WithErrorCode("KinkConsentManager.Domain.LoginValidator.LoginOrEmailMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength);

        RuleFor(x => x.Password)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Password"))
                .WithErrorCode("KinkConsentManager.Domain.LoginValidator.PasswordRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MaximumLength(100)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "Password", 100))
                .WithErrorCode("KinkConsentManager.Domain.LoginValidator.PasswordMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength);
    }
}
