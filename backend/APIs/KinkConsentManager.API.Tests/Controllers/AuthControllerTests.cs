using System.Net;
using System.Security.Claims;
using KinkConsentManager.API.Controllers.V1;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Service.Cqrs.Authentication.Commands;
using KinkConsentManager.Core.Service.Cqrs.Authentication.Queries;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.API.Tests.Controllers;

[TestFixture]
public sealed class AuthControllerTests
{
    private Mock<IApplicationDispatcher> _dispatcherMock = null!;
    private AuthController _controller = null!;

    [SetUp]
    public void SetUp()
    {
        _dispatcherMock = new Mock<IApplicationDispatcher>(MockBehavior.Strict);
        _controller = new AuthController(_dispatcherMock.Object)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };
    }

    [Test]
    public void Constructor_WhenDispatcherIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Instanciação de AuthController recebendo dispatcher nulo.
        // Objetivo: Garantir que a dependência obrigatória IApplicationDispatcher seja validada no construtor.
        var act = () => new AuthController(null!);

        act.Should().Throw<ArgumentNullException>()
            .WithParameterName("dispatcher");
    }

    [Test]
    public async Task Register_WhenDispatcherReturns201_ShouldReturn201WithUserDto()
    {
        // Cenário: Requisição válida de cadastro processada pelo dispatcher retornando StatusCode 201.
        // Objetivo: Verificar que AuthController.Register devolve HTTP 201 com o envelope ServiceResponse<UserKinkDto>.
        var request = new RegisterUserKinkRequestDto(
            "alex_silva",
            "alex@example.com",
            "Str0ng!Pass",
            "Str0ng!Pass");

        var expectedDto = new UserKinkDto(
            10,
            request.Login,
            true,
            DateTime.UtcNow,
            null);

        var serviceResponse = ServiceResponse<UserKinkDto>.Ok(
            expectedDto,
            "User registered successfully.",
            AuthenticationMessageKeys.UserRegistered,
            StatusCodes.Status201Created);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<RegisterUserKinkCommand>(c => c.Request == request),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Register(request, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status201Created);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<UserKinkDto>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().Be(expectedDto);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Register_WhenDispatcherReturns409_ShouldReturn409Conflict()
    {
        // Cenário: Tentativa de cadastro cujo login ou e-mail já existe, retornando StatusCode 409 do dispatcher.
        // Objetivo: Verificar que AuthController.Register propaga HTTP 409 com o envelope de falha.
        var request = new RegisterUserKinkRequestDto(
            "alex_silva",
            "alex@example.com",
            "Str0ng!Pass",
            "Str0ng!Pass");

        var serviceResponse = ServiceResponse<UserKinkDto>.Fail(
            AuthenticationMessageKeys.LoginAlreadyExists,
            StatusCodes.Status409Conflict);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<RegisterUserKinkCommand>(c => c.Request == request),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Register(request, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status409Conflict);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<UserKinkDto>>().Subject;
        payload.Success.Should().BeFalse();
        payload.MessageKey.Should().Be(AuthenticationMessageKeys.LoginAlreadyExists);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Login_WhenCredentialsAreValid_ShouldReturn200AndForwardRemoteIp()
    {
        // Cenário: Requisição de login com HttpContext possuindo RemoteIpAddress configurado e dispatcher retornando 200.
        // Objetivo: Verificar que AuthController.Login envia LoginCommand com o IP do cliente e retorna HTTP 200.
        const string clientIp = "203.0.113.10";
        _controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = IPAddress.Parse(clientIp);

        var loginDto = new LoginDto
        {
            LoginOrEmail = "alex_silva",
            Password = "Str0ng!Pass"
        };

        var userDto = new UserKinkDto(1, "alex_silva", true, DateTime.UtcNow, DateTime.UtcNow);
        var loginResponse = new LoginResponseDto(
            "jwt-access-token",
            "opaque-refresh-token",
            DateTime.UtcNow.AddHours(1),
            DateTime.UtcNow.AddDays(7),
            userDto);

        var serviceResponse = ServiceResponse<LoginResponseDto>.Ok(
            loginResponse,
            "Login successful.",
            AuthenticationMessageKeys.LoginSuccessful);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<LoginCommand>(c => c.Request == loginDto && c.RemoteIp == clientIp),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Login(loginDto, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<LoginResponseDto>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().Be(loginResponse);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Login_WhenCredentialsAreInvalid_ShouldReturn401Unauthorized()
    {
        // Cenário: Dispatcher retorna resposta 401 Unauthorized para credenciais inválidas.
        // Objetivo: Verificar que AuthController.Login devolve HTTP 401 preservando o envelope de erro.
        const string clientIp = "198.51.100.25";
        _controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = IPAddress.Parse(clientIp);

        var loginDto = new LoginDto
        {
            LoginOrEmail = "alex_silva",
            Password = "WrongPassword!"
        };

        var serviceResponse = ServiceResponse<LoginResponseDto>.UnauthorizedResponse("Invalid login credentials.");
        serviceResponse.MessageKey = AuthenticationMessageKeys.InvalidCredentials;

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<LoginCommand>(c => c.Request == loginDto && c.RemoteIp == clientIp),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Login(loginDto, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<LoginResponseDto>>().Subject;
        payload.Success.Should().BeFalse();
        payload.Unauthorized.Should().BeTrue();
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Refresh_WhenRefreshTokenIsValid_ShouldReturn200WithNewTokens()
    {
        // Cenário: Requisição de rotação de refresh token bem-sucedida retornando StatusCode 200 do dispatcher.
        // Objetivo: Verificar que AuthController.Refresh envia RefreshTokenCommand com IP e retorna HTTP 200.
        const string clientIp = "192.0.2.44";
        _controller.ControllerContext.HttpContext.Connection.RemoteIpAddress = IPAddress.Parse(clientIp);

        var refreshDto = new RefreshTokenDto { Token = "valid-refresh-token" };
        var userDto = new UserKinkDto(1, "alex_silva", true, DateTime.UtcNow, DateTime.UtcNow);
        var loginResponse = new LoginResponseDto(
            "new-access-token",
            "new-refresh-token",
            DateTime.UtcNow.AddHours(1),
            DateTime.UtcNow.AddDays(7),
            userDto);

        var serviceResponse = ServiceResponse<LoginResponseDto>.Ok(
            loginResponse,
            "Token refreshed successfully.",
            AuthenticationMessageKeys.TokenRefreshed);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<RefreshTokenCommand>(c => c.Request == refreshDto && c.RemoteIp == clientIp),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Refresh(refreshDto, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<LoginResponseDto>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().Be(loginResponse);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Refresh_WhenRefreshTokenIsInvalidOrReused_ShouldReturn401Unauthorized()
    {
        // Cenário: Dispatcher identifica refresh token inválido ou reutilizado e retorna 401 Unauthorized.
        // Objetivo: Verificar que AuthController.Refresh devolve HTTP 401 preservando a resposta do dispatcher.
        var refreshDto = new RefreshTokenDto { Token = "reused-refresh-token" };
        var serviceResponse = ServiceResponse<LoginResponseDto>.UnauthorizedResponse("Refresh token reuse detected.");
        serviceResponse.MessageKey = AuthenticationMessageKeys.RefreshTokenReused;

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<RefreshTokenCommand>(c => c.Request == refreshDto),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Refresh(refreshDto, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<LoginResponseDto>>().Subject;
        payload.Success.Should().BeFalse();
        payload.MessageKey.Should().Be(AuthenticationMessageKeys.RefreshTokenReused);
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Logout_WhenNameIdClaimIsMissing_ShouldReturn401WithoutCallingDispatcher()
    {
        // Cenário: Usuário autenticado no HttpContext sem a claim nameid.
        // Objetivo: Garantir que AuthController.Logout retorne HTTP 401 sem invocar o IApplicationDispatcher.
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

        var actionResult = await _controller.Logout(new LogoutRequestDto("some-token"), CancellationToken.None);

        var unauthorizedResult = actionResult.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var payload = unauthorizedResult.Value.Should().BeOfType<ServiceResponse<bool>>().Subject;
        payload.Unauthorized.Should().BeTrue();
        _dispatcherMock.VerifyNoOtherCalls();
    }

    [Test]
    public async Task Logout_WhenNameIdClaimIsValid_ShouldReturn200AndSendLogoutCommand()
    {
        // Cenário: HttpContext possui ClaimsPrincipal válido com claim nameid = "42" e requisição de logout.
        // Objetivo: Verificar que AuthController.Logout extrai o UserKinkId, envia LogoutCommand e retorna HTTP 200.
        SetAuthenticatedUser(42);
        var request = new LogoutRequestDto("refresh-token-to-revoke");
        var serviceResponse = ServiceResponse<bool>.Ok(
            true,
            "Logout successful.",
            AuthenticationMessageKeys.LogoutSuccessful);

        _dispatcherMock
            .Setup(d => d.SendAsync(
                It.Is<LogoutCommand>(c => c.UserKinkId == 42 && c.Request == request),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Logout(request, CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<bool>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().BeTrue();
        _dispatcherMock.VerifyAll();
    }

    [Test]
    public async Task Me_WhenNameIdClaimIsMissing_ShouldReturn401WithoutCallingDispatcher()
    {
        // Cenário: Requisição ao endpoint Me com ClaimsPrincipal sem claim nameid.
        // Objetivo: Garantir que AuthController.Me retorne HTTP 401 sem consultar o IApplicationDispatcher.
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

        var actionResult = await _controller.Me(CancellationToken.None);

        var unauthorizedResult = actionResult.Should().BeOfType<UnauthorizedObjectResult>().Subject;
        unauthorizedResult.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var payload = unauthorizedResult.Value.Should().BeOfType<ServiceResponse<UserKinkDto>>().Subject;
        payload.Unauthorized.Should().BeTrue();
        _dispatcherMock.VerifyNoOtherCalls();
    }

    [Test]
    public async Task Me_WhenNameIdClaimIsValid_ShouldReturn200WithCurrentUser()
    {
        // Cenário: HttpContext possui ClaimsPrincipal válido com claim nameid = "42".
        // Objetivo: Verificar que AuthController.Me despacha GetCurrentUserKinkQuery e retorna HTTP 200 com o perfil.
        SetAuthenticatedUser(42);
        var userDto = new UserKinkDto(42, "alex_silva", true, DateTime.UtcNow, DateTime.UtcNow);
        var serviceResponse = ServiceResponse<UserKinkDto>.Ok(
            userDto,
            "Authenticated user retrieved successfully.",
            AuthenticationMessageKeys.CurrentUserRetrieved);

        _dispatcherMock
            .Setup(d => d.QueryAsync(
                It.Is<GetCurrentUserKinkQuery>(q => q.UserKinkId == 42),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(serviceResponse);

        var actionResult = await _controller.Me(CancellationToken.None);

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status200OK);
        var payload = objectResult.Value.Should().BeOfType<ServiceResponse<UserKinkDto>>().Subject;
        payload.Success.Should().BeTrue();
        payload.Data.Should().Be(userDto);
        _dispatcherMock.VerifyAll();
    }

    private void SetAuthenticatedUser(long userId)
    {
        var identity = new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString())],
            "Bearer");
        _controller.ControllerContext.HttpContext.User = new ClaimsPrincipal(identity);
    }
}
