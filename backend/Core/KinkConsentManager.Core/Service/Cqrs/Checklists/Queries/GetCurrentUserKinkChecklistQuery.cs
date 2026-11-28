using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Checklists.Queries;

/// <summary>
/// Consulta CQRS para obtenção do checklist salvo on-line do usuário autenticado.
/// </summary>
/// <param name="UserKinkId">Identificador do usuário autenticado.</param>
public sealed record GetCurrentUserKinkChecklistQuery(long UserKinkId)
    : IQuery<UserKinkChecklistDto>;

/// <summary>
/// Handler responsável por executar <see cref="GetCurrentUserKinkChecklistQuery"/> via <see cref="IUserKinkChecklistService"/>.
/// </summary>
public sealed class GetCurrentUserKinkChecklistQueryHandler
    : IQueryHandler<GetCurrentUserKinkChecklistQuery, UserKinkChecklistDto>
{
    private readonly IUserKinkChecklistService _checklistService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="GetCurrentUserKinkChecklistQueryHandler"/>.
    /// </summary>
    /// <param name="checklistService">Serviço de aplicação do checklist on-line.</param>
    public GetCurrentUserKinkChecklistQueryHandler(IUserKinkChecklistService checklistService)
    {
        _checklistService = checklistService ?? throw new ArgumentNullException(nameof(checklistService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<UserKinkChecklistDto>> HandleAsync(
        GetCurrentUserKinkChecklistQuery query,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        return _checklistService.GetCurrentAsync(query.UserKinkId, cancellationToken);
    }
}
