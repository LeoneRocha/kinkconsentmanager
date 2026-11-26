using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;

/// <summary>
/// Comando CQRS para autenticação por login ou e-mail e emissão de tokens JWT.
/// </summary>
/// <param name="Request">Credenciais de login.</param>
/// <param name="RemoteIp">Endereço IP de origem do cliente, quando disponível.</param>
public sealed record LoginCommand(LoginDto Request, string? RemoteIp = null)
    : ICommand<LoginResponseDto>, IHasValidationPayload<LoginDto>
{
    /// <inheritdoc />
    public LoginDto Payload => Request;
}

/// <summary>
/// Handler responsável por executar <see cref="LoginCommand"/> via <see cref="IAuthenticationService"/>.
/// </summary>
public sealed class LoginCommandHandler : ICommandHandler<LoginCommand, LoginResponseDto>
{
    private readonly IAuthenticationService _authenticationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="LoginCommandHandler"/>.
    /// </summary>
    /// <param name="authenticationService">Serviço de autenticação de usuários.</param>
    public LoginCommandHandler(IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<LoginResponseDto>> HandleAsync(
        LoginCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _authenticationService.LoginAsync(command.Request, command.RemoteIp, cancellationToken);
    }
}
