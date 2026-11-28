using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Extensions;

namespace KinkConsentManager.Core.Domain.Validators.Checklists;

/// <summary>
/// Validador do contrato de criação/atualização do checklist on-line (<see cref="UpsertUserKinkChecklistRequestDto"/>).
/// </summary>
public sealed partial class UpsertUserKinkChecklistRequestValidator : AbstractValidator<UpsertUserKinkChecklistRequestDto>
{
    /// <summary>Limite máximo permitido para o payload UTF-8 de respostas (512 KB).</summary>
    public const int MaxAnswersJsonBytes = 524_288;

    private static readonly HashSet<string> AllowedLanguages = new(StringComparer.Ordinal)
    {
        "pt-BR",
        "en-US"
    };

    /// <summary>
    /// Inicializa as regras de validação com resolução dinâmica de mensagens por idioma via <see cref="IValidationMessageService"/>.
    /// </summary>
    /// <param name="messages">Serviço centralizado de localização.</param>
    public UpsertUserKinkChecklistRequestValidator(IValidationMessageService messages)
    {
        ArgumentNullException.ThrowIfNull(messages);

        RuleFor(x => x.SchemaVersion)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "SchemaVersion"))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.SchemaVersionRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .MaximumLength(20)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.MaximumLength, "{PropertyName} must not exceed {MaxLength} characters.", "SchemaVersion", 20))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.SchemaVersionMax")
                .WithMessageKey(ValidationMessageKeys.MaximumLength)
            .Must(v => !string.IsNullOrWhiteSpace(v) && SemVerRegex().IsMatch(v.Trim()))
                .When(x => !string.IsNullOrWhiteSpace(x.SchemaVersion), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.InvalidFormat, "{PropertyName} has an invalid format.", "SchemaVersion"))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.SchemaVersionFormat")
                .WithMessageKey(ValidationMessageKeys.InvalidFormat);

        RuleFor(x => x.Language)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "Language"))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.LanguageRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .Must(IsSupportedLanguage)
                .When(x => !string.IsNullOrWhiteSpace(x.Language), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.ChecklistInvalidLanguage, "Supported languages are pt-BR and en-US."))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.LanguageUnsupported")
                .WithMessageKey(ValidationMessageKeys.ChecklistInvalidLanguage);

        RuleFor(x => x.AnswersJson)
            .NotEmpty()
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.RequiredField, "{PropertyName} is required.", "AnswersJson"))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.AnswersJsonRequired")
                .WithMessageKey(ValidationMessageKeys.RequiredField)
            .Must(HaveAllowedByteSize)
                .When(x => !string.IsNullOrWhiteSpace(x.AnswersJson), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.ChecklistPayloadTooLarge, "Checklist payload exceeds the maximum allowed size."))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.AnswersJsonTooLarge")
                .WithMessageKey(ValidationMessageKeys.ChecklistPayloadTooLarge)
            .Must(BeValidJsonObject)
                .When(x => !string.IsNullOrWhiteSpace(x.AnswersJson) && HaveAllowedByteSize(x.AnswersJson), ApplyConditionTo.CurrentValidator)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.ChecklistInvalidJson, "AnswersJson must be a valid JSON object."))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.AnswersJsonInvalid")
                .WithMessageKey(ValidationMessageKeys.ChecklistInvalidJson);

        RuleFor(x => x.ExpectedVersion)
            .GreaterThanOrEqualTo(1)
                .When(x => x.ExpectedVersion.HasValue)
                .WithMessage(_ => messages.GetMessage(ValidationMessageKeys.InvalidFormat, "{PropertyName} has an invalid format.", "ExpectedVersion"))
                .WithErrorCode("KinkConsentManager.Domain.UpsertUserKinkChecklistValidator.ExpectedVersionInvalid")
                .WithMessageKey(ValidationMessageKeys.InvalidFormat);
    }

    private static bool IsSupportedLanguage(string? language) =>
        !string.IsNullOrWhiteSpace(language) && AllowedLanguages.Contains(language.Trim());

    private static bool HaveAllowedByteSize(string? json) =>
        json is not null && Encoding.UTF8.GetByteCount(json) <= MaxAnswersJsonBytes;

    private static bool BeValidJsonObject(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    [GeneratedRegex(@"^\d+\.\d+\.\d+$", RegexOptions.CultureInvariant)]
    private static partial Regex SemVerRegex();
}
