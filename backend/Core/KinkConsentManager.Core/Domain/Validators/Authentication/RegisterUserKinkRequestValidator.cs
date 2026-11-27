using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador do contrato de cadastro de usuário (<see cref="RegisterUserKinkRequestDto"/>),
/// incluindo verificação independente de unicidade de <c>Login</c> e <c>Email</c>.
/// </summary>
public sealed class RegisterUserKinkRequestValidator : AbstractValidator<RegisterUserKinkRequestDto>
{
    /// <summary>Código de erro emitido quando o login informado já está em uso.</summary>
    public const string LoginAlreadyExistsErrorCode =
        "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginAlreadyExists";

    /// <summary>Código de erro emitido quando o e-mail informado já está em uso.</summary>
    public const string EmailAlreadyExistsErrorCode =
        "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailAlreadyExists";

    /// <summary>Inicializa as regras de cadastro com suporte dinâmico a idiomas via <see cref="IValidationMessageService"/> e validação de unicidade.</summary>
    /// <param name="passwordValidator">Validador centralizado de senha forte.</param>
    /// <param name="messages">Serviço centralizado de localização.</param>
    /// <param name="userKinkRepository">Repositório utilizado para validar unicidade independente de login e e-mail.</param>
    public RegisterUserKinkRequestValidator(
        IValidator<string> passwordValidator,
        IValidationMessageService messages,
        IUserKinkRepository userKinkRepository)
    {
        ArgumentNullException.ThrowIfNull(passwordValidator);
        ArgumentNullException.ThrowIfNull(messages);
        ArgumentNullException.ThrowIfNull(userKinkRepository);

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
                .WithMessageKey(ValidationMessageKeys.LoginInvalidCharacters)
            .MustAsync(async (login, cancellationToken) =>
                !await userKinkRepository.LoginExistsAsync(login.Trim(), cancellationToken))
                .When(x => !string.IsNullOrWhiteSpace(x.Login), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(AuthenticationMessageKeys.LoginAlreadyExists, "Login is already in use."))
                .WithErrorCode(LoginAlreadyExistsErrorCode)
                .WithMessageKey(AuthenticationMessageKeys.LoginAlreadyExists);

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
                .WithMessageKey(ValidationMessageKeys.MaximumLength)
            .MustAsync(async (email, cancellationToken) =>
            {
                if (!TryCreateEmail(email, out var emailVo))
                {
                    return true;
                }

                return !await userKinkRepository.EmailExistsAsync(emailVo!, cancellationToken);
            })
                .When(x => !string.IsNullOrWhiteSpace(x.Email), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(AuthenticationMessageKeys.EmailAlreadyExists, "Email is already in use."))
                .WithErrorCode(EmailAlreadyExistsErrorCode)
                .WithMessageKey(AuthenticationMessageKeys.EmailAlreadyExists);

        RuleFor(x => x.Password).SetValidator(passwordValidator);

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.Password)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.PasswordsDoNotMatch, "The passwords do not match."))
                .WithErrorCode("KinkConsentManager.Domain.RegisterUserKinkValidator.PasswordMatch")
                .WithMessageKey(ValidationMessageKeys.PasswordsDoNotMatch);
    }

    private static bool TryCreateEmail(string rawEmail, out Email? email)
    {
        try
        {
            email = new Email(rawEmail.Trim());
            return true;
        }
        catch (ArgumentException)
        {
            email = null;
            return false;
        }
        catch (FormatException)
        {
            email = null;
            return false;
        }
    }
}
