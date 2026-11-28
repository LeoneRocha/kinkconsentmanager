using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using Microsoft.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Service.Validation;

namespace KinkConsentManager.Core.Service.Services;

/// <summary>
/// Serviço de aplicação responsável pelo ciclo de vida 1:1 do checklist on-line em <c>kink_consent.UserKinkCheclists</c>.
/// Nunca grava o conteúdo de <c>AnswersJson</c> nos logs para preservar a privacidade do usuário.
/// </summary>
public sealed class UserKinkChecklistService : IUserKinkChecklistService
{
    private readonly IUserKinkChecklistRepository _checklistRepository;
    private readonly ISmartCoreHubMapper _mapper;
    private readonly IAppLogger _logger;
    private readonly IValidator<UpsertUserKinkChecklistRequestDto> _validator;
    private readonly IValidationMessageService _validationMessages;
    private readonly IErrorGetLocalizationService _errorLocalizationService;
    private readonly IChecklistPayloadProtector _payloadProtector;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="UserKinkChecklistService"/>.
    /// </summary>
    /// <param name="checklistRepository">Repositório de persistência de <see cref="UserKinkCheclist"/>.</param>
    /// <param name="mapper">Mapeador de objetos do SDK.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    /// <param name="validator">Validador FluentValidation do payload de upsert.</param>
    /// <param name="validationMessages">Serviço de localização de mensagens funcionais.</param>
    /// <param name="errorLocalizationService">Serviço de localização de erros de validação do SDK.</param>
    /// <param name="payloadProtector">Serviço de compressão (Zstd) e criptografia (AES-GCM) do <c>AnswersJson</c>.</param>
    public UserKinkChecklistService(
        IUserKinkChecklistRepository checklistRepository,
        ISmartCoreHubMapper mapper,
        IAppLogger logger,
        IValidator<UpsertUserKinkChecklistRequestDto> validator,
        IValidationMessageService validationMessages,
        IErrorGetLocalizationService errorLocalizationService,
        IChecklistPayloadProtector payloadProtector)
    {
        _checklistRepository = checklistRepository ?? throw new ArgumentNullException(nameof(checklistRepository));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _validator = validator ?? throw new ArgumentNullException(nameof(validator));
        _validationMessages = validationMessages ?? throw new ArgumentNullException(nameof(validationMessages));
        _errorLocalizationService = errorLocalizationService ?? throw new ArgumentNullException(nameof(errorLocalizationService));
        _payloadProtector = payloadProtector ?? throw new ArgumentNullException(nameof(payloadProtector));
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<UserKinkChecklistDto>> GetCurrentAsync(
        long userKinkId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _checklistRepository.GetByUserKinkIdAsync(userKinkId, cancellationToken);
        if (existing is null || !existing.IsActive)
        {
            return BuildLocalizedFailResponse<UserKinkChecklistDto>(
                ChecklistMessageKeys.ChecklistNotFound,
                "No saved online checklist was found for this user.",
                404);
        }

        var dto = MapWithDecryptedAnswers(existing);

        return ServiceResponse<UserKinkChecklistDto>.Ok(
            dto,
            _validationMessages.GetMessage(ChecklistMessageKeys.ChecklistRetrieved, "Checklist retrieved successfully."),
            ChecklistMessageKeys.ChecklistRetrieved);
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<UserKinkChecklistDto>> UpsertCurrentAsync(
        long userKinkId,
        UpsertUserKinkChecklistRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var validationResult = await _validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return await BuildValidationErrorResponseAsync<UserKinkChecklistDto>(
                validationResult.Errors,
                cancellationToken);
        }

        var normalizedClientUpdatedAtUtc = NormalizeUtc(request.ClientUpdatedAtUtc);
        var normalizedSchemaVersion = request.SchemaVersion.Trim();
        var normalizedLanguage = request.Language.Trim();
        var protectedAnswersJson = _payloadProtector.Protect(request.AnswersJson);
        var existing = await _checklistRepository.GetByUserKinkIdAsync(userKinkId, cancellationToken);

        if (existing is null)
        {
            var entity = new UserKinkCheclist
            {
                UserKinkId = userKinkId,
                SchemaVersion = normalizedSchemaVersion,
                Language = normalizedLanguage,
                AnswersJson = protectedAnswersJson,
                ClientUpdatedAtUtc = normalizedClientUpdatedAtUtc,
                Version = 1,
                IsActive = true
            };

            var created = await _checklistRepository.AddAsync(entity, cancellationToken);
            _logger.LogInfo(
                "Created online checklist for UserKinkId {UserKinkId} (Version {Version}, SchemaVersion {SchemaVersion}).",
                userKinkId,
                created.Version,
                created.SchemaVersion);

            return ServiceResponse<UserKinkChecklistDto>.Ok(
                MapWithPlainAnswers(created, request.AnswersJson),
                _validationMessages.GetMessage(ChecklistMessageKeys.ChecklistSaved, "Checklist saved online successfully."),
                ChecklistMessageKeys.ChecklistSaved);
        }

        if (request.ExpectedVersion.HasValue && request.ExpectedVersion.Value != existing.Version)
        {
            _logger.LogWarning(
                "Checklist version conflict for UserKinkId {UserKinkId}: expected {ExpectedVersion}, current {ActualVersion}.",
                userKinkId,
                request.ExpectedVersion.Value,
                existing.Version);

            return BuildLocalizedFailResponse<UserKinkChecklistDto>(
                ChecklistMessageKeys.ChecklistVersionConflict,
                "A newer version of this checklist already exists online. Reload before saving.",
                409);
        }

        existing.SchemaVersion = normalizedSchemaVersion;
        existing.Language = normalizedLanguage;
        existing.AnswersJson = protectedAnswersJson;
        existing.ClientUpdatedAtUtc = normalizedClientUpdatedAtUtc;
        existing.Version += 1;
        existing.IsActive = true;
        existing.UpdateTimestamp();

        try
        {
            var updated = await _checklistRepository.UpdateAsync(existing, cancellationToken);
            _logger.LogInfo(
                "Updated online checklist for UserKinkId {UserKinkId} to Version {Version} (SchemaVersion {SchemaVersion}).",
                userKinkId,
                updated.Version,
                updated.SchemaVersion);

            return ServiceResponse<UserKinkChecklistDto>.Ok(
                MapWithPlainAnswers(updated, request.AnswersJson),
                _validationMessages.GetMessage(ChecklistMessageKeys.ChecklistSaved, "Checklist saved online successfully."),
                ChecklistMessageKeys.ChecklistSaved);
        }
        catch (DbUpdateConcurrencyException)
        {
            _logger.LogWarning(
                "Optimistic concurrency exception while saving checklist for UserKinkId {UserKinkId}.",
                userKinkId);

            return BuildLocalizedFailResponse<UserKinkChecklistDto>(
                ChecklistMessageKeys.ChecklistVersionConflict,
                "A newer version of this checklist already exists online. Reload before saving.",
                409);
        }
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<bool>> DeleteCurrentAsync(
        long userKinkId,
        CancellationToken cancellationToken = default)
    {
        var deleted = await _checklistRepository.DeleteByUserKinkIdAsync(userKinkId, cancellationToken);
        _logger.LogInfo(
            "Checklist deletion processed for UserKinkId {UserKinkId} (Removed={Removed}).",
            userKinkId,
            deleted);

        return ServiceResponse<bool>.Ok(
            true,
            _validationMessages.GetMessage(ChecklistMessageKeys.ChecklistDeleted, "Saved checklist removed successfully."),
            ChecklistMessageKeys.ChecklistDeleted);
    }

    private UserKinkChecklistDto MapWithDecryptedAnswers(UserKinkCheclist entity)
    {
        var dto = _mapper.Map<UserKinkChecklistDto>(entity);
        return dto with { AnswersJson = _payloadProtector.Unprotect(entity.AnswersJson) };
    }

    private UserKinkChecklistDto MapWithPlainAnswers(UserKinkCheclist entity, string plainAnswersJson)
    {
        var dto = _mapper.Map<UserKinkChecklistDto>(entity);
        return dto with { AnswersJson = plainAnswersJson };
    }

    private static DateTime NormalizeUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    private async Task<ServiceResponse<T>> BuildValidationErrorResponseAsync<T>(
        IEnumerable<FluentValidation.Results.ValidationFailure> failures,
        CancellationToken cancellationToken)
    {
        var errors = await FluentValidationErrorMappingHelper.MapAsync(
            failures,
            _errorLocalizationService,
            "Validation",
            cancellationToken);

        return ServiceResponse<T>.Error(
            errors,
            _validationMessages.GetMessage(ValidationMessageKeys.Failed, "Validation failed."),
            ValidationMessageKeys.Failed);
    }

    private ServiceResponse<T> BuildLocalizedFailResponse<T>(
        string messageKey,
        string fallbackMessage,
        int statusCode)
    {
        var localized = _validationMessages.GetMessage(messageKey, fallbackMessage);
        var response = ServiceResponse<T>.Fail(messageKey, statusCode);
        response.Message = localized;

        if (response.Errors.Count > 0)
        {
            response.Errors[0].Description = localized;
            response.Errors[0].DefaultMessage = localized;
        }

        return response;
    }
}
