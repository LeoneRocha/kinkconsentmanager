using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;

/// <summary>
/// Comando CQRS para cadastro de um novo usuário na plataforma.
/// </summary>
/// <param name="Request">Dados de entrada para cadastro do usuário.</param>
public sealed record RegisterUserKinkCommand(RegisterUserKinkRequestDto Request)
    : ICommand<UserKinkDto>, IHasValidationPayload<RegisterUserKinkRequestDto>
{
    /// <inheritdoc />
    public RegisterUserKinkRequestDto Payload => Request;
}

/// <summary>
/// Handler responsável por executar <see cref="RegisterUserKinkCommand"/> via <see cref="IAuthenticationService"/>.
/// </summary>
public sealed class RegisterUserKinkCommandHandler : ICommandHandler<RegisterUserKinkCommand, UserKinkDto>
{
    private readonly IAuthenticationService _authenticationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="RegisterUserKinkCommandHandler"/>.
    /// </summary>
    /// <param name="authenticationService">Serviço de autenticação e cadastro de usuários.</param>
    public RegisterUserKinkCommandHandler(IAuthenticationService authenticationService)
    {
        _authenticationService = authenticationService ?? throw new ArgumentNullException(nameof(authenticationService));
    }

    /// <inheritdoc />
    public Task<ServiceResponse<UserKinkDto>> HandleAsync(
        RegisterUserKinkCommand command,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(command);
        return _authenticationService.RegisterAsync(command.Request, cancellationToken);
    }
}
