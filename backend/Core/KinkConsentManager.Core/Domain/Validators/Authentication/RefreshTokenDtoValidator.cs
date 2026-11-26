using FluentValidation;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Domain.Validators.Authentication;

/// <summary>
/// Validador do contrato de renovação de sessão (<see cref="RefreshTokenDto"/> do SmartCoreHub.Core.SDK).
/// </summary>
public sealed class RefreshTokenDtoValidator : AbstractValidator<RefreshTokenDto>
{
    /// <summary>Inicializa as regras de validação de refresh token com localização centralizada.</summary>
    /// <param name="messages">Serviço centralizado de localização.</param>
    public RefreshTokenDtoValidator(IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x.Token)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "RefreshToken"))
                .WithErrorCode("KinkConsentManager.Domain.RefreshTokenValidator.Required")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MaximumLength(512)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RefreshTokenInvalid, "Refresh token is invalid."))
                .WithErrorCode("KinkConsentManager.Domain.RefreshTokenValidator.Max")
                .WithMessageKey(ValidationMessageKeys.RefreshTokenInvalid);
    }
}
