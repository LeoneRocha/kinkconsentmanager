using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;

/// <summary>
/// Comando CQRS para encerramento de sessão e revogação de refresh token(s) do usuário autenticado.
/// </summary>
/// <param name="UserKinkId">Identificador do usuário autenticado.</param>
/// <param name="Request">Parâmetros de revogação da sessão.</param>
public sealed record LogoutCommand(long UserKinkId, LogoutRequestDto Request) : ICommand<bool>;

/// <summary>
/// Handler responsável por executar <see cref="LogoutCommand"/> via <see cref="IAuthenticationService"/>.
/// </summary>
public sealed class LogoutCommandHandler : ICommandHandler<LogoutCommand, bool>
{
    private readonly IAuthenticationService _authenticationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="LogoutCommandHandler"/>.
    /// </summary>
    /// <param name="authenticationService">Serviço de autenticação de usuários.</param>
    public LogoutCommandHandler(IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<bool>> HandleAsync(
        LogoutCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _authenticationService.LogoutAsync(command.UserKinkId, command.Request, cancellationToken);
    }
}
