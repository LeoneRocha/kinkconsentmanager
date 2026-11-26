using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;
using KinkConsentManager.Core.Service.Cqrs.Authentication.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;
using SmartCoreHub.Core.SDK.Domain.Security;
using SmartCoreHub.Core.SDK.Service.API.Generic;

namespace KinkConsentManager.API.Controllers.V1;

/// <summary>
/// Controlador v1 responsável pelo cadastro, autenticação, renovação e encerramento de sessão de usuários.
/// </summary>
[Route("api/v1/[controller]")]
[Produces("application/json")]
public sealed class AuthController : BaseApiController
{
    private const string InvalidTokenMessage = "The authentication token is invalid or missing.";

    private readonly IApplicationDispatcher _dispatcher;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="AuthController"/>.
    /// </summary>
    /// <param name="dispatcher">Despachante CQRS utilizado para enviar commands e queries.</param>
    /// <exception cref="ArgumentNullException">Lançada quando <paramref name="dispatcher"/> for nulo.</exception>
    public AuthController(IApplicationDispatcher dispatcher)
    {
        _dispatcher = dispatcher ?? throw new ArgumentNullException(nameof(dispatcher));
    }

    /// <summary>
    /// Cadastra um novo usuário na plataforma.
    /// </summary>
    /// <param name="request">Dados cadastrais do novo usuário.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com os dados públicos do usuário criado ou detalhes de erro.</returns>
    /// <response code="201">Usuário cadastrado com sucesso.</response>
    /// <response code="400">Dados de entrada inválidos.</response>
    /// <response code="409">Login ou e-mail já cadastrado.</response>
    [AllowAnonymous]
    [HttpPost("register")]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkDto>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkDto>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterUserKinkRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var response = await _dispatcher.SendAsync(new RegisterUserKinkCommand(request), cancellationToken);
        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Autentica um usuário por login ou e-mail e emite os tokens JWT da sessão.
    /// </summary>
    /// <param name="loginDto">Credenciais de acesso (login ou e-mail e senha).</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com access token, refresh token e perfil do usuário.</returns>
    /// <response code="200">Autenticação concluída com sucesso.</response>
    /// <response code="400">Credenciais ausentes ou em formato inválido.</response>
    /// <response code="401">Credenciais inválidas ou conta inativa.</response>
    /// <response code="429">Limite de tentativas excedido.</response>
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto loginDto,
        CancellationToken cancellationToken = default)
    {
        var response = await _dispatcher.SendAsync(new LoginCommand(loginDto, GetApplicationIp()), cancellationToken);
        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Renova a sessão aplicando rotação de refresh token.
    /// </summary>
    /// <param name="refreshTokenDto">Refresh token atual a ser rotacionado.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com o novo par de tokens da sessão.</returns>
    /// <response code="200">Sessão renovada com sucesso.</response>
    /// <response code="400">Refresh token ausente ou em formato inválido.</response>
    /// <response code="401">Refresh token inválido, expirado ou reutilizado.</response>
    [AllowAnonymous]
    [HttpPost("refresh")]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ServiceResponse<LoginResponseDto>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh(
        [FromBody] RefreshTokenDto refreshTokenDto,
        CancellationToken cancellationToken = default)
    {
        var response = await _dispatcher.SendAsync(
            new RefreshTokenCommand(refreshTokenDto, GetApplicationIp()),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Encerra a sessão atual ou todas as sessões ativas do usuário autenticado.
    /// </summary>
    /// <param name="request">Parâmetros opcionais de revogação do refresh token.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope indicando o sucesso do encerramento de sessão.</returns>
    /// <response code="200">Sessão encerrada com sucesso.</response>
    /// <response code="401">Token de autenticação ausente ou inválido.</response>
    [Authorize]
    [HttpPost("logout")]
    [ProducesResponseType(typeof(ServiceResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<bool>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutRequestDto? request = null,
        CancellationToken cancellationToken = default)
    {
        var userKinkId = UserClaimsHelper.TryGetUserId(User);
        if (userKinkId is null or <= 0)
        {
            return Unauthorized(ServiceResponse<bool>.UnauthorizedResponse(InvalidTokenMessage));
        }

        var logoutRequest = request ?? new LogoutRequestDto(null);
        var response = await _dispatcher.SendAsync(
            new LogoutCommand(userKinkId.Value, logoutRequest),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Obtém os dados cadastrais públicos do usuário autenticado.
    /// </summary>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com o perfil resumido do usuário autenticado.</returns>
    /// <response code="200">Perfil do usuário obtido com sucesso.</response>
    /// <response code="401">Token de autenticação ausente ou inválido.</response>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkDto>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken = default)
    {
        var userKinkId = UserClaimsHelper.TryGetUserId(User);
        if (userKinkId is null or <= 0)
        {
            return Unauthorized(ServiceResponse<UserKinkDto>.UnauthorizedResponse(InvalidTokenMessage));
        }

        var response = await _dispatcher.QueryAsync(
            new GetCurrentUserKinkQuery(userKinkId.Value),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }
}
