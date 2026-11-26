using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador do contrato de cadastro de usuário (<see cref="RegisterUserKinkRequestDto"/>).
/// </summary>
public sealed class RegisterUserKinkRequestValidator : AbstractValidator<RegisterUserKinkRequestDto>
{
    /// <summary>Inicializa as regras de cadastro com suporte dinâmico a idiomas via <see cref="IValidationMessageService"/>.</summary>
    /// <param name="passwordValidator">Validador centralizado de senha forte.</param>
    /// <param name="messages">Serviço centralizado de localização.</param>
    public RegisterUserKinkRequestValidator(
        IValidator<string> passwordValidator,
        IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(passwordValidator);
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x.Name)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Name"))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.NameRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MinimumLength(3)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MinimumLength, "{PropertyName} must be at least {MinLength} characters.", "Name", 3))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.NameMin")
                .WithMessageKey(ValidationMessageKeys.MinimumLength)
            .MaximumLength(100)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "Name", 100))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.NameMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength);

        RuleFor(x => x.Login)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Login"))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.LoginRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MinimumLength(3)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MinimumLength, "{PropertyName} must be at least {MinLength} characters.", "Login", 3))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMin")
                .WithMessageKey(ValidationMessageKeys.MinimumLength)
            .MaximumLength(50)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "Login", 50))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength)
            .Matches(@"^[a-zA-Z0-9_-]+$")
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.LoginInvalidCharacters, "Login must contain only alphanumeric characters, underscores or hyphens."))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.LoginChars")
                .WithMessageKey(ValidationMessageKeys.LoginInvalidCharacters);

        RuleFor(x => x.Email)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Email"))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.EmailRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .EmailAddress()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.InvalidEmail, "{PropertyName} is not a valid email address.", "Email"))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.EmailInvalid")
                .WithMessageKey(ValidationMessageKeys.InvalidEmail)
            .MaximumLength(191)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "Email", 191))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.EmailMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength);

        RuleFor(x => x.Password).SetValidator(passwordValidator);

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordsDoNotMatch, "The passwords do not match."))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.PasswordMatch")
                .WithMessageKey(ValidationMessageKeys.PasswordsDoNotMatch);
    }
}
