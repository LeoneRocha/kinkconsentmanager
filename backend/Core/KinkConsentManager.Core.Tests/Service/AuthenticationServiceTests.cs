using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Service.Localization;
using KinkConsentManager.Core.Service.Mappings;
using KinkConsentManager.Core.Service.Security;
using KinkConsentManager.Core.Service.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Application.Transactions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;
using SmartCoreHub.Core.SDK.Domain.DTOs.Entities;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;
using SmartCoreHub.Core.SDK.Infrastructure.DependencyInjection;
using SmartCoreHub.Core.SDK.Infrastructure.Helpers.Security;
using SmartCoreHub.Core.SDK.Infrastructure.Security;
using SmartCoreHub.Core.SDK.Service.API.DI.Mapping.Extensions;
using SmartCoreHub.Core.SDK.Service.Security;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class AuthenticationServiceTests
{
    private const string TestSecret = "KinkConsentManager_AuthService_Tests_Signing_Key_64_Bytes_Minimum!!";

    private ServiceProvider _serviceProvider = null!;
    private Mock<IUserKinkRepository> _userRepositoryMock = null!;
    private Mock<IUserKinkRefreshTokenRepository> _refreshTokenRepositoryMock = null!;
    private Mock<ITransactionExecutor> _transactionExecutorMock = null!;
    private IJwtTokenService _jwtTokenService = null!;
    private AuthenticationService _sut = null!;

    [SetUp]
    public void SetUp()
    {
        var tokenConfig = new TokenConfigurationDto
        {
            Secret = TestSecret,
            Issuer = "KinkConsentManager.API",
            Audience = "KinkConsentManager.Client",
            Minutes = 60,
            DaysToExpiry = 7
        };

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSmartCoreHubFunctionalMessages(
            options =>
            {
                options.DefaultCulture = new CultureInfo("en-US");
                options.SupportedCultures = new List<CultureInfo>
                {
                    new("en-US"),
                    new("pt-BR")
                };
            },
            typeof(KinkConsentManagerDbContext).Assembly,
            "KinkConsentManager.Core.Infrastructure.Localization.Resources");
        services.AddSdkAutoMapper(typeof(AutoMapperProfile).Assembly);
        services.AddScoped<IValidationMessageService, ValidationMessageService>();
        services.AddScoped<IErrorGetLocalizationService>(sp =>
            (ValidationMessageService)sp.GetRequiredService<IValidationMessageService>());
        services.AddValidatorsFromAssemblyContaining<RegisterUserKinkRequestValidator>();

        _serviceProvider = services.BuildServiceProvider();

        var mapper = _serviceProvider.GetRequiredService<ISmartCoreHubMapper>();
        var validationMessages = _serviceProvider.GetRequiredService<IValidationMessageService>();
        var errorLocalization = _serviceProvider.GetRequiredService<IErrorGetLocalizationService>();
        var registerValidator = _serviceProvider.GetRequiredService<IValidator<RegisterUserKinkRequestDto>>();
        var loginValidator = _serviceProvider.GetRequiredService<IValidator<LoginDto>>();
        var refreshTokenValidator = _serviceProvider.GetRequiredService<IValidator<RefreshTokenDto>>();
        var passwordVerificationValidator = _serviceProvider.GetRequiredService<IValidator<PasswordVerificationInput>>();

        var securityFactory = new SecurityTokenAdapterFactory(new ConfigurationBuilder().Build(), tokenConfig);
        _jwtTokenService = new JwtTokenService(new JwtAccessTokenService(securityFactory));

        _userRepositoryMock = new Mock<IUserKinkRepository>();
        _refreshTokenRepositoryMock = new Mock<IUserKinkRefreshTokenRepository>();
        _transactionExecutorMock = new Mock<ITransactionExecutor>();

        _sut = new AuthenticationService(
            _userRepositoryMock.Object,
            _refreshTokenRepositoryMock.Object,
            _jwtTokenService,
            tokenConfig,
            mapper,
            NullAppLogger.Instance,
            _transactionExecutorMock.Object,
            registerValidator,
            loginValidator,
            refreshTokenValidator,
            passwordVerificationValidator,
            validationMessages,
            errorLocalization);
    }

    [TearDown]
    public void TearDown()
    {
        _serviceProvider.Dispose();
    }

    [Test]
    public async Task RegisterAsync_WhenValidRequestAndUniqueCredentials_ShouldReturn201WithBcryptHashAndNormalizedLogin()
    {
        // Cenário: Cadastro de novo usuário com dados válidos e login/e-mail ainda não utilizados.
        // Objetivo: Verificar status 201, hash BCrypt distinto da senha pura, NormalizedLogin em minúsculas e retorno do UserKinkDto.
        UserKink? persistedEntity = null;
        _userRepositoryMock.Setup(r => r.LoginExistsAsync("Alex_Silva", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _userRepositoryMock.Setup(r => r.EmailExistsAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _userRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<UserKink>(), It.IsAny<CancellationToken>()))
            .Callback<UserKink, CancellationToken>((u, _) =>
            {
                u.Id = 101;
                persistedEntity = u;
            })
            .ReturnsAsync((UserKink u, CancellationToken _) => u);

        var request = new RegisterUserKinkRequestDto(
            Name: "  Alex Silva  ",
            Login: "Alex_Silva",
            Email: "Alex.Silva@Example.com",
            Password: "Strong@Password1",
            ConfirmPassword: "Strong@Password1");

        var response = await _sut.RegisterAsync(request);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(201);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.UserRegistered);
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(101);
        response.Data.Name.Should().Be("Alex Silva");
        response.Data.Login.Should().Be("Alex_Silva");
        response.Data.Email.Should().Be("alex.silva@example.com");

        persistedEntity.Should().NotBeNull();
        persistedEntity!.NormalizedLogin.Should().Be("alex_silva");
        persistedEntity.PasswordHash.Should().NotBe("Strong@Password1");
        PasswordHasherFactory.GetHasher(PasswordAlgorithm.Bcrypt)
            .VerifyPassword("Strong@Password1", persistedEntity.PasswordHash)
            .Should().BeTrue();
    }

    [Test]
    public async Task RegisterAsync_WhenRequestFailsValidation_ShouldReturn400WithoutPersisting()
    {
        // Cenário: Requisição de cadastro com senha fraca e confirmação divergente.
        // Objetivo: Garantir retorno HTTP 400 com erros mapeados e nenhuma chamada aos repositórios.
        var request = new RegisterUserKinkRequestDto(
            Name: "Al",
            Login: "invalid login",
            Email: "not-an-email",
            Password: "weak",
            ConfirmPassword: "other");

        var response = await _sut.RegisterAsync(request);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(400);
        response.MessageKey.Should().Be(ValidationMessageKeys.Failed);
        response.Errors.Should().NotBeEmpty();

        _userRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserKink>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task RegisterAsync_WhenLoginAlreadyExists_ShouldReturn409Conflict()
    {
        // Cenário: Cadastro tentando utilizar um login já existente na base.
        // Objetivo: Garantir retorno HTTP 409 com MessageKey LoginAlreadyExists.
        _userRepositoryMock.Setup(r => r.LoginExistsAsync("Alex_Silva", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var request = new RegisterUserKinkRequestDto(
            Name: "Alex Silva",
            Login: "Alex_Silva",
            Email: "alex@example.com",
            Password: "Strong@Password1",
            ConfirmPassword: "Strong@Password1");

        var response = await _sut.RegisterAsync(request);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(409);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.LoginAlreadyExists);
        _userRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserKink>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task RegisterAsync_WhenEmailAlreadyExists_ShouldReturn409Conflict()
    {
        // Cenário: Cadastro com login inédito mas e-mail já cadastrado.
        // Objetivo: Garantir retorno HTTP 409 com MessageKey EmailAlreadyExists.
        _userRepositoryMock.Setup(r => r.LoginExistsAsync("Alex_Silva", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _userRepositoryMock.Setup(r => r.EmailExistsAsync(new Email("alex@example.com"), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var request = new RegisterUserKinkRequestDto(
            Name: "Alex Silva",
            Login: "Alex_Silva",
            Email: "alex@example.com",
            Password: "Strong@Password1",
            ConfirmPassword: "Strong@Password1");

        var response = await _sut.RegisterAsync(request);

        response.Success.Should().BeFalse();
        response.StatusCode.Should().Be(409);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.EmailAlreadyExists);
        _userRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserKink>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [TestCase("alex_silva")]
    [TestCase("ALEX_SILVA")]
    [TestCase("alex.silva@example.com")]
    [TestCase("ALEX.SILVA@EXAMPLE.COM")]
    public async Task LoginAsync_WhenCredentialsMatchByLoginOrEmailCaseInsensitively_ShouldSucceedAndPersistTokenHash(string loginOrEmail)
    {
        // Cenário: Login bem-sucedido usando login ou e-mail com variação de caixa.
        // Objetivo: Verificar emissão de tokens, atualização de LastLoginAt e persistência do hash SHA-256 do refresh token.
        var user = CreateActiveUser(id: 55, login: "Alex_Silva", email: "alex.silva@example.com", password: "Strong@Password1");
        UserKinkRefreshToken? savedToken = null;

        _userRepositoryMock
            .Setup(r => r.GetByLoginOrEmailAsync(loginOrEmail, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _userRepositoryMock
            .Setup(r => r.UpdateAsync(user, It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);
        _refreshTokenRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<UserKinkRefreshToken>(), It.IsAny<CancellationToken>()))
            .Callback<UserKinkRefreshToken, CancellationToken>((t, _) => savedToken = t)
            .ReturnsAsync((UserKinkRefreshToken t, CancellationToken _) => t);

        var response = await _sut.LoginAsync(
            new LoginDto { LoginOrEmail = loginOrEmail, Password = "Strong@Password1" },
            remoteIp: "127.0.0.1");

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.LoginSuccessful);
        response.Data.Should().NotBeNull();
        response.Data!.TokenType.Should().Be("Bearer");
        response.Data.User.Id.Should().Be(55);
        user.LastLoginAt.Should().NotBeNull();

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(response.Data.AccessToken);
        jwt.Header.Alg.Should().Be("HS512");
        jwt.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.NameId && c.Value == "55");
        jwt.Claims.Should().Contain(c => c.Type == "login" && c.Value == "Alex_Silva");

        savedToken.Should().NotBeNull();
        savedToken!.UserKinkId.Should().Be(55);
        savedToken.CreatedByIp.Should().Be("127.0.0.1");
        savedToken.TokenHash.Should().Be(_jwtTokenService.ComputeTokenHash(response.Data.RefreshToken));
        savedToken.TokenHash.Should().NotBe(response.Data.RefreshToken);
    }

    [Test]
    public async Task LoginAsync_WhenPasswordIsWrong_ShouldReturn401InvalidCredentials()
    {
        // Cenário: Tentativa de login com senha incorreta para usuário ativo existente.
        // Objetivo: Retornar HTTP 401 com chave anti-enumeração InvalidCredentials.
        var user = CreateActiveUser(id: 55, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        _userRepositoryMock
            .Setup(r => r.GetByLoginOrEmailAsync("Alex_Silva", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var response = await _sut.LoginAsync(new LoginDto { LoginOrEmail = "Alex_Silva", Password = "Wrong@Password1" });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidCredentials);
        _refreshTokenRepositoryMock.Verify(r => r.AddAsync(It.IsAny<UserKinkRefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task LoginAsync_WhenUserDoesNotExist_ShouldReturn401InvalidCredentials()
    {
        // Cenário: Tentativa de login com identificador inexistente.
        // Objetivo: Retornar HTTP 401 com chave anti-enumeração InvalidCredentials.
        _userRepositoryMock
            .Setup(r => r.GetByLoginOrEmailAsync("unknown_user", It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserKink?)null);

        var response = await _sut.LoginAsync(new LoginDto { LoginOrEmail = "unknown_user", Password = "Strong@Password1" });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidCredentials);
    }

    [Test]
    public async Task LoginAsync_WhenUserIsInactive_ShouldReturn401InvalidCredentials()
    {
        // Cenário: Tentativa de login para conta desativada (IsActive = false) mesmo com senha correta.
        // Objetivo: Retornar HTTP 401 com chave anti-enumeração InvalidCredentials.
        var user = CreateActiveUser(id: 55, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        user.Deactivate();

        _userRepositoryMock
            .Setup(r => r.GetByLoginOrEmailAsync("Alex_Silva", It.IsAny<CancellationToken>()))
            .ReturnsAsync(user);

        var response = await _sut.LoginAsync(new LoginDto { LoginOrEmail = "Alex_Silva", Password = "Strong@Password1" });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidCredentials);
    }

    [Test]
    public async Task RefreshTokenAsync_WhenTokenIsValid_ShouldRotateTokenInsideTransactionAndReturn200()
    {
        // Cenário: Refresh token válido e ativo submetido para renovação de sessão.
        // Objetivo: Revogar o token antigo com ReplacedByTokenHash, criar novo token em transação e retornar novos AccessToken/RefreshToken.
        var user = CreateActiveUser(id: 88, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        var rawToken = "valid-raw-refresh-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);
        var existingToken = new UserKinkRefreshToken
        {
            Id = 10,
            UserKinkId = user.Id,
            UserKink = user,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(3),
            RevokedAtUtc = null,
            IsActive = true
        };

        UserKinkRefreshToken? newlyAddedToken = null;
        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingToken);
        _refreshTokenRepositoryMock
            .Setup(r => r.UpdateAsync(existingToken, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingToken);
        _refreshTokenRepositoryMock
            .Setup(r => r.AddAsync(It.IsAny<UserKinkRefreshToken>(), It.IsAny<CancellationToken>()))
            .Callback<UserKinkRefreshToken, CancellationToken>((t, _) => newlyAddedToken = t)
            .ReturnsAsync((UserKinkRefreshToken t, CancellationToken _) => t);

        var response = await _sut.RefreshTokenAsync(new RefreshTokenDto { Token = rawToken }, remoteIp: "10.0.0.1");

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.TokenRefreshed);
        response.Data.Should().NotBeNull();
        response.Data!.RefreshToken.Should().NotBe(rawToken);

        existingToken.RevokedAtUtc.Should().NotBeNull();
        existingToken.IsActive.Should().BeFalse();
        existingToken.ReplacedByTokenHash.Should().Be(_jwtTokenService.ComputeTokenHash(response.Data.RefreshToken));

        newlyAddedToken.Should().NotBeNull();
        newlyAddedToken!.TokenHash.Should().Be(existingToken.ReplacedByTokenHash);
        newlyAddedToken.CreatedByIp.Should().Be("10.0.0.1");

        _transactionExecutorMock.Verify(t => t.BeginAsync(It.IsAny<CancellationToken>()), Times.Once);
        _transactionExecutorMock.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        _transactionExecutorMock.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task RefreshTokenAsync_WhenTokenDoesNotExist_ShouldReturn401InvalidRefreshToken()
    {
        // Cenário: Refresh token cujo hash não existe no repositório.
        // Objetivo: Garantir retorno HTTP 401 com MessageKey InvalidRefreshToken.
        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((UserKinkRefreshToken?)null);

        var response = await _sut.RefreshTokenAsync(new RefreshTokenDto { Token = "missing-token" });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidRefreshToken);
    }

    [Test]
    public async Task RefreshTokenAsync_WhenTokenIsExpired_ShouldReturn401InvalidRefreshToken()
    {
        // Cenário: Refresh token existente porém com ExpiresAtUtc no passado.
        // Objetivo: Garantir rejeição HTTP 401 com MessageKey InvalidRefreshToken.
        var user = CreateActiveUser(id: 88, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        const string rawToken = "expired-raw-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserKinkRefreshToken
            {
                Id = 11,
                UserKinkId = user.Id,
                UserKink = user,
                TokenHash = tokenHash,
                ExpiresAtUtc = DateTime.UtcNow.AddMinutes(-1),
                RevokedAtUtc = null,
                IsActive = true
            });

        var response = await _sut.RefreshTokenAsync(new RefreshTokenDto { Token = rawToken });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.InvalidRefreshToken);
    }

    [Test]
    public async Task RefreshTokenAsync_WhenTokenWasAlreadyRevoked_ShouldTriggerReuseDetectionAndRevokeAllSessions()
    {
        // Cenário: Reapresentação de refresh token já revogado anteriormente (RevokedAtUtc != null).
        // Objetivo: Acionar Reuse Detection revogando todas as sessões ativas do usuário e retornar 401 RefreshTokenReused.
        var user = CreateActiveUser(id: 88, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        const string rawToken = "reused-raw-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserKinkRefreshToken
            {
                Id = 12,
                UserKinkId = user.Id,
                UserKink = user,
                TokenHash = tokenHash,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(5),
                RevokedAtUtc = DateTime.UtcNow.AddMinutes(-10),
                IsActive = false
            });

        var response = await _sut.RefreshTokenAsync(new RefreshTokenDto { Token = rawToken });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.RefreshTokenReused);

        _refreshTokenRepositoryMock.Verify(
            r => r.RevokeAllActiveByUserKinkIdAsync(88, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _transactionExecutorMock.Verify(t => t.BeginAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task RefreshTokenAsync_WhenUserIsInactive_ShouldReturn401UserInactive()
    {
        // Cenário: Refresh token válido porém pertencente a usuário desativado.
        // Objetivo: Bloquear renovação retornando HTTP 401 com MessageKey UserInactive.
        var user = CreateActiveUser(id: 88, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        user.Deactivate();
        const string rawToken = "inactive-user-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserKinkRefreshToken
            {
                Id = 13,
                UserKinkId = user.Id,
                UserKink = user,
                TokenHash = tokenHash,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(5),
                RevokedAtUtc = null,
                IsActive = true
            });

        var response = await _sut.RefreshTokenAsync(new RefreshTokenDto { Token = rawToken });

        response.Success.Should().BeFalse();
        response.Unauthorized.Should().BeTrue();
        response.StatusCode.Should().Be(401);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.UserInactive);
    }

    [Test]
    public async Task LogoutAsync_WhenSpecificTokenBelongsToUser_ShouldRevokeOnlyThatToken()
    {
        // Cenário: Logout solicitando revogação de um refresh token específico pertencente ao usuário autenticado.
        // Objetivo: Revogar o token via UpdateAsync sem chamar RevokeAllActiveByUserKinkIdAsync.
        const string rawToken = "current-session-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);
        var tokenEntity = new UserKinkRefreshToken
        {
            Id = 20,
            UserKinkId = 55,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(5),
            RevokedAtUtc = null,
            IsActive = true
        };

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(tokenEntity);
        _refreshTokenRepositoryMock
            .Setup(r => r.UpdateAsync(tokenEntity, It.IsAny<CancellationToken>()))
            .ReturnsAsync(tokenEntity);

        var response = await _sut.LogoutAsync(55, new LogoutRequestDto(rawToken, RevokeAllSessions: false));

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.Data.Should().BeTrue();
        response.MessageKey.Should().Be(AuthenticationMessageKeys.LogoutSuccessful);
        tokenEntity.RevokedAtUtc.Should().NotBeNull();
        tokenEntity.IsActive.Should().BeFalse();

        _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(tokenEntity, It.IsAny<CancellationToken>()), Times.Once);
        _refreshTokenRepositoryMock.Verify(
            r => r.RevokeAllActiveByUserKinkIdAsync(It.IsAny<long>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Test]
    public async Task LogoutAsync_WhenRevokeAllSessionsIsTrue_ShouldRevokeAllActiveTokensForUser()
    {
        // Cenário: Logout com RevokeAllSessions = true.
        // Objetivo: Invocar RevokeAllActiveByUserKinkIdAsync para encerrar todas as sessões do usuário.
        var response = await _sut.LogoutAsync(55, new LogoutRequestDto(null, RevokeAllSessions: true));

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.Data.Should().BeTrue();
        response.MessageKey.Should().Be(AuthenticationMessageKeys.LogoutSuccessful);

        _refreshTokenRepositoryMock.Verify(
            r => r.RevokeAllActiveByUserKinkIdAsync(55, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Test]
    public async Task LogoutAsync_WhenTokenBelongsToAnotherUser_ShouldNotRevokeToken()
    {
        // Cenário: Usuário 55 tenta revogar um refresh token cujo proprietário é o usuário 999.
        // Objetivo: Garantir isolamento multi-usuário impedindo a revogação de sessões de terceiros.
        const string rawToken = "other-user-token";
        var tokenHash = _jwtTokenService.ComputeTokenHash(rawToken);
        var otherUserToken = new UserKinkRefreshToken
        {
            Id = 21,
            UserKinkId = 999,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(5),
            RevokedAtUtc = null,
            IsActive = true
        };

        _refreshTokenRepositoryMock
            .Setup(r => r.GetByTokenHashAsync(tokenHash, It.IsAny<CancellationToken>()))
            .ReturnsAsync(otherUserToken);

        var response = await _sut.LogoutAsync(55, new LogoutRequestDto(rawToken, RevokeAllSessions: false));

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        otherUserToken.RevokedAtUtc.Should().BeNull();
        otherUserToken.IsActive.Should().BeTrue();
        _refreshTokenRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<UserKinkRefreshToken>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Test]
    public async Task GetCurrentUserAsync_WhenUserExistsAndIsActive_ShouldReturn200WithDto()
    {
        // Cenário: Consulta do perfil autenticado para usuário ativo existente.
        // Objetivo: Retornar HTTP 200 com UserKinkDto mapeado e MessageKey CurrentUserRetrieved.
        var user = CreateActiveUser(id: 55, login: "Alex_Silva", email: "alex@example.com", password: "Strong@Password1");
        _userRepositoryMock.Setup(r => r.GetByIdAsync(55, It.IsAny<CancellationToken>())).ReturnsAsync(user);

        var response = await _sut.GetCurrentUserAsync(55);

        response.Success.Should().BeTrue();
        response.StatusCode.Should().Be(200);
        response.MessageKey.Should().Be(AuthenticationMessageKeys.CurrentUserRetrieved);
        response.Data.Should().NotBeNull();
        response.Data!.Id.Should().Be(55);
        response.Data.Login.Should().Be("Alex_Silva");
        response.Data.Email.Should().Be("alex@example.com");
    }

    [Test]
    public async Task GetCurrentUserAsync_WhenUserIsMissingOrInactive_ShouldReturn401UserInactive()
    {
        // Cenário: Consulta do usuário atual quando o ID não existe ou a conta está desativada.
        // Objetivo: Retornar HTTP 401 com MessageKey UserInactive em ambos os casos.
        _userRepositoryMock.Setup(r => r.GetByIdAsync(404, It.IsAny<CancellationToken>())).ReturnsAsync((UserKink?)null);

        var inactiveUser = CreateActiveUser(id: 405, login: "Inactive_User", email: "inactive@example.com", password: "Strong@Password1");
        inactiveUser.Deactivate();
        _userRepositoryMock.Setup(r => r.GetByIdAsync(405, It.IsAny<CancellationToken>())).ReturnsAsync(inactiveUser);

        var missingResponse = await _sut.GetCurrentUserAsync(404);
        var inactiveResponse = await _sut.GetCurrentUserAsync(405);

        missingResponse.Success.Should().BeFalse();
        missingResponse.Unauthorized.Should().BeTrue();
        missingResponse.StatusCode.Should().Be(401);
        missingResponse.MessageKey.Should().Be(AuthenticationMessageKeys.UserInactive);

        inactiveResponse.Success.Should().BeFalse();
        inactiveResponse.Unauthorized.Should().BeTrue();
        inactiveResponse.StatusCode.Should().Be(401);
        inactiveResponse.MessageKey.Should().Be(AuthenticationMessageKeys.UserInactive);
    }

    private static UserKink CreateActiveUser(long id, string login, string email, string password)
    {
        var hash = PasswordHasherFactory.GetHasher(PasswordAlgorithm.Bcrypt).HashPassword(password);
        var user = new UserKink
        {
            Id = id,
            Name = "Alex Silva",
            Email = new Email(email),
            PasswordHash = hash,
            IsActive = true
        };
        user.SetLogin(login);
        return user;
    }
}
