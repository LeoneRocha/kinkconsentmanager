using FluentValidation;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador de entrada para verificação criptográfica de senha (<see cref="PasswordVerificationInput"/> do SmartCoreHub.Core.SDK).
/// </summary>
public sealed class PasswordVerificationInputValidator : AbstractValidator<PasswordVerificationInput>
{
    /// <summary>Inicializa as regras de validação de entrada para verificação de senha.</summary>
    /// <param name="messages">Serviço centralizado de localização.</param>
    public PasswordVerificationInputValidator(IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x.Password)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Password"))
                .WithErrorCode("KinkConsentManager.Domain.PasswordVerificationValidator.PasswordRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField);

        RuleFor(x => x.Hash)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Hash"))
                .WithErrorCode("KinkConsentManager.Domain.PasswordVerificationValidator.HashRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField);
    }
}
