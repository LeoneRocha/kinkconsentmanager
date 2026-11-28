using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Checklists.Commands;

/// <summary>
/// Comando CQRS para exclusão do checklist salvo on-line do usuário autenticado.
/// </summary>
/// <param name="UserKinkId">Identificador do usuário autenticado.</param>
public sealed record DeleteCurrentUserKinkChecklistCommand(long UserKinkId)
    : ICommand<bool>;

/// <summary>
/// Handler responsável por executar <see cref="DeleteCurrentUserKinkChecklistCommand"/> via <see cref="IUserKinkChecklistService"/>.
/// </summary>
public sealed class DeleteCurrentUserKinkChecklistCommandHandler
    : ICommandHandler<DeleteCurrentUserKinkChecklistCommand, bool>
{
    private readonly IUserKinkChecklistService _checklistService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="DeleteCurrentUserKinkChecklistCommandHandler"/>.
    /// </summary>
    /// <param name="checklistService">Serviço de aplicação do checklist on-line.</param>
    public DeleteCurrentUserKinkChecklistCommandHandler(IUserKinkChecklistService checklistService)
    {
        _checklistService = checklistService ?? throw new ArgumentNullException(nameof(checklistService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<bool>> HandleAsync(
        DeleteCurrentUserKinkChecklistCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _checklistService.DeleteCurrentAsync(command.UserKinkId, cancellationToken);
    }
}
