using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Authentication.Queries;

/// <summary>
/// Consulta CQRS para obtenção do perfil cadastral do usuário autenticado.
/// </summary>
/// <param name="UserKinkId">Identificador do usuário autenticado.</param>
public sealed record GetCurrentUserKinkQuery(long UserKinkId) : IQuery<UserKinkDto>;

/// <summary>
/// Handler responsável por executar <see cref="GetCurrentUserKinkQuery"/> via <see cref="IAuthenticationService"/>.
/// </summary>
public sealed class GetCurrentUserKinkQueryHandler : IQueryHandler<GetCurrentUserKinkQuery, UserKinkDto>
{
    private readonly IAuthenticationService _authenticationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="GetCurrentUserKinkQueryHandler"/>.
    /// </summary>
    /// <param name="authenticationService">Serviço de autenticação e consulta de usuário.</param>
    public GetCurrentUserKinkQueryHandler(IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<UserKinkDto>> HandleAsync(
        GetCurrentUserKinkQuery query,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(query);
        return _authenticationService.GetCurrentUserAsync(query.UserKinkId, cancellationToken);
    }
}
