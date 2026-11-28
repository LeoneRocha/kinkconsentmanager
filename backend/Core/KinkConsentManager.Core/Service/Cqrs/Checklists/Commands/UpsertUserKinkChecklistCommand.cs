using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Checklists.Commands;

/// <summary>
/// Comando CQRS para criação ou atualização (upsert) do checklist on-line do usuário autenticado.
/// </summary>
/// <param name="UserKinkId">Identificador do usuário autenticado.</param>
/// <param name="Request">Dados do checklist a persistir.</param>
public sealed record UpsertUserKinkChecklistCommand(
    long UserKinkId,
    UpsertUserKinkChecklistRequestDto Request) : ICommand<UserKinkChecklistDto>;

/// <summary>
/// Handler responsável por executar <see cref="UpsertUserKinkChecklistCommand"/> via <see cref="IUserKinkChecklistService"/>.
/// </summary>
public sealed class UpsertUserKinkChecklistCommandHandler
    : ICommandHandler<UpsertUserKinkChecklistCommand, UserKinkChecklistDto>
{
    private readonly IUserKinkChecklistService _checklistService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="UpsertUserKinkChecklistCommandHandler"/>.
    /// </summary>
    /// <param name="checklistService">Serviço de aplicação do checklist on-line.</param>
    public UpsertUserKinkChecklistCommandHandler(IUserKinkChecklistService checklistService)
    {
        _checklistService = checklistService ?? throw new ArgumentNullException(nameof(checklistService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<UserKinkChecklistDto>> HandleAsync(
        UpsertUserKinkChecklistCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _checklistService.UpsertCurrentAsync(command.UserKinkId, command.Request, cancellationToken);
    }
}
