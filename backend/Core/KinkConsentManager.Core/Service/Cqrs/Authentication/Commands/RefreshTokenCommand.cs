using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;

/// <summary>
/// Comando CQRS para renovação de sessão utilizando rotação de refresh token e detecção de reúso.
/// </summary>
/// <param name="Request">Refresh token atual.</param>
/// <param name="RemoteIp">Endereço IP de origem do cliente, quando disponível.</param>
public sealed record RefreshTokenCommand(RefreshTokenDto Request, string? RemoteIp = null)
    : ICommand<LoginResponseDto>, IHasValidationPayload<RefreshTokenDto>
{
    /// <inheritdoc />
    public RefreshTokenDto Payload => Request;
}

/// <summary>
/// Handler responsável por executar <see cref="RefreshTokenCommand"/> via <see cref="IAuthenticationService"/>.
/// </summary>
public sealed class RefreshTokenCommandHandler : ICommandHandler<RefreshTokenCommand, LoginResponseDto>
{
    private readonly IAuthenticationService _authenticationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="RefreshTokenCommandHandler"/>.
    /// </summary>
    /// <param name="authenticationService">Serviço de autenticação e rotação de tokens.</param>
    public RefreshTokenCommandHandler(IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<LoginResponseDto>> HandleAsync(
        RefreshTokenCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _authenticationService.RefreshTokenAsync(command.Request, command.RemoteIp, cancellationToken);
    }
}
