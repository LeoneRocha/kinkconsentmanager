using System.IdentityModel.Tokens.Jwt;
using FluentValidation;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Service.Security;
using SmartCoreHub.Core.SDK.Application.Transactions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;
using SmartCoreHub.Core.SDK.Domain.DTOs.Entities;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;
using SmartCoreHub.Core.SDK.Infrastructure.Helpers.Security;
using SmartCoreHub.Core.SDK.Service.Validation;

namespace KinkConsentManager.Core.Service.Services;

/// <summary>
/// Serviço de autenticação responsável por cadastro, login dual (login ou e-mail),
/// rotação de refresh token com Reuse Detection, logout e consulta do usuário autenticado.
/// </summary>
public sealed class AuthenticationService : IAuthenticationService
{
    private const int DefaultAccessTokenMinutes = 60;
    private const int DefaultRefreshTokenDays = 7;

    private readonly IUserKinkRepository _userKinkRepository;
    private readonly IUserKinkRefreshTokenRepository _refreshTokenRepository;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ITokenConfigurationDto _tokenConfig;
    private readonly ISmartCoreHubMapper _mapper;
    private readonly IAppLogger _logger;
    private readonly ITransactionExecutor _transactionExecutor;
    private readonly IValidator<RegisterUserKinkRequestDto> _registerValidator;
    private readonly IValidator<LoginDto> _loginValidator;
    private readonly IValidator<RefreshTokenDto> _refreshTokenValidator;
    private readonly IValidator<PasswordVerificationInput> _passwordVerificationValidator;
    private readonly IValidationMessageService _validationMessages;
    private readonly IErrorGetLocalizationService _errorLocalizationService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="AuthenticationService"/>.
    /// </summary>
    /// <param name="userKinkRepository">Repositório de usuários.</param>
    /// <param name="refreshTokenRepository">Repositório de refresh tokens persistidos.</param>
    /// <param name="jwtTokenService">Serviço de geração e validação de tokens JWT e refresh tokens.</param>
    /// <param name="tokenConfig">Configurações de tempo de expiração e assinatura de tokens.</param>
    /// <param name="mapper">Mapeador de objetos do SDK.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    /// <param name="transactionExecutor">Executor de transações de banco de dados.</param>
    /// <param name="registerValidator">Validador do DTO de cadastro.</param>
    /// <param name="loginValidator">Validador do DTO de login.</param>
    /// <param name="refreshTokenValidator">Validador do DTO de refresh token.</param>
    /// <param name="passwordVerificationValidator">Validador de entrada para verificação criptográfica de senha.</param>
    /// <param name="validationMessages">Serviço centralizado de resolução de mensagens localizadas.</param>
    /// <param name="errorLocalizationService">Serviço de localização de erros de validação do SDK.</param>
    public AuthenticationService(
        IUserKinkRepository userKinkRepository,
        IUserKinkRefreshTokenRepository refreshTokenRepository,
        IJwtTokenService jwtTokenService,
        ITokenConfigurationDto tokenConfig,
        ISmartCoreHubMapper mapper,
        IAppLogger logger,
        ITransactionExecutor transactionExecutor,
        IValidator<RegisterUserKinkRequestDto> registerValidator,
        IValidator<LoginDto> loginValidator,
        IValidator<RefreshTokenDto> refreshTokenValidator,
        IValidator<PasswordVerificationInput> passwordVerificationValidator,
        IValidationMessageService validationMessages,
        IErrorGetLocalizationService errorLocalizationService)
    {
        _userKinkRepository = userKinkRepository ?? throw new ArgumentNullException(nameof(userKinkRepository));
        _refreshTokenRepository = refreshTokenRepository ?? throw new ArgumentNullException(nameof(refreshTokenRepository));
        _jwtTokenService = jwtTokenService ?? throw new ArgumentNullException(nameof(jwtTokenService));
        _tokenConfig = tokenConfig ?? throw new ArgumentNullException(nameof(tokenConfig));
        _mapper = mapper ?? throw new ArgumentNullException(nameof(mapper));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _transactionExecutor = transactionExecutor ?? throw new ArgumentNullException(nameof(transactionExecutor));
        _registerValidator = registerValidator ?? throw new ArgumentNullException(nameof(registerValidator));
        _loginValidator = loginValidator ?? throw new ArgumentNullException(nameof(loginValidator));
        _refreshTokenValidator = refreshTokenValidator ?? throw new ArgumentNullException(nameof(refreshTokenValidator));
        _passwordVerificationValidator = passwordVerificationValidator ?? throw new ArgumentNullException(nameof(passwordVerificationValidator));
        _validationMessages = validationMessages ?? throw new ArgumentNullException(nameof(validationMessages));
        _errorLocalizationService = errorLocalizationService ?? throw new ArgumentNullException(nameof(errorLocalizationService));
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<UserKinkDto>> RegisterAsync(
        RegisterUserKinkRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var validationResult = await _registerValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return await BuildValidationErrorResponseAsync<UserKinkDto>(validationResult.Errors, cancellationToken);
        }

        if (await _userKinkRepository.LoginExistsAsync(request.Login, cancellationToken))
        {
            return BuildLocalizedFailResponse<UserKinkDto>(
                AuthenticationMessageKeys.LoginAlreadyExists,
                "Login is already in use.",
                409);
        }

        var email = new Email(request.Email.Trim());
        if (await _userKinkRepository.EmailExistsAsync(email, cancellationToken))
        {
            return BuildLocalizedFailResponse<UserKinkDto>(
                AuthenticationMessageKeys.EmailAlreadyExists,
                "Email is already in use.",
                409);
        }

        var passwordHash = PasswordHasherFactory.GetHasher(PasswordAlgorithm.Bcrypt).HashPassword(request.Password);
        var user = new UserKink
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = passwordHash,
            IsActive = true
        };
        user.SetLogin(request.Login);

        var persisted = await _userKinkRepository.AddAsync(user, cancellationToken);
        var dto = _mapper.Map<UserKinkDto>(persisted);

        _logger.LogInfo("UserKink registered successfully with ID {UserKinkId}.", persisted.Id);

        return ServiceResponse<UserKinkDto>.Ok(
            dto,
            _validationMessages.GetMessage(AuthenticationMessageKeys.UserRegistered, "User registered successfully."),
            AuthenticationMessageKeys.UserRegistered,
            201);
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<LoginResponseDto>> LoginAsync(
        LoginDto request,
        string? remoteIp = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var validationResult = await _loginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return await BuildValidationErrorResponseAsync<LoginResponseDto>(validationResult.Errors, cancellationToken);
        }

        var user = await AuthenticateUserAsync(request.LoginOrEmail, request.Password, cancellationToken);
        if (user is null)
        {
            _logger.LogWarning("Authentication failed due to invalid credentials or inactive account.");
            return BuildUnauthorizedResponse<LoginResponseDto>(
                AuthenticationMessageKeys.InvalidCredentials,
                "Invalid login credentials.");
        }

        var utcNow = DateTime.UtcNow;
        user.LastLoginAt = utcNow;
        await _userKinkRepository.UpdateAsync(user, cancellationToken);

        var (rawRefreshToken, refreshTokenHash) = _jwtTokenService.GenerateSecureRefreshToken();
        var refreshExpiresAtUtc = CalculateRefreshTokenExpiryUtc(utcNow);

        var refreshTokenEntity = new UserKinkRefreshToken
        {
            UserKinkId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAtUtc = refreshExpiresAtUtc,
            CreatedByIp = remoteIp
        };
        await _refreshTokenRepository.AddAsync(refreshTokenEntity, cancellationToken);

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var loginResponse = BuildLoginResponseDto(user, accessToken, rawRefreshToken, refreshExpiresAtUtc, utcNow);

        _logger.LogInfo("UserKink authenticated successfully with ID {UserKinkId}.", user.Id);

        return ServiceResponse<LoginResponseDto>.Ok(
            loginResponse,
            _validationMessages.GetMessage(AuthenticationMessageKeys.LoginSuccessful, "Login successful."),
            AuthenticationMessageKeys.LoginSuccessful);
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<LoginResponseDto>> RefreshTokenAsync(
        RefreshTokenDto request,
        string? remoteIp = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var validationResult = await _refreshTokenValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return await BuildValidationErrorResponseAsync<LoginResponseDto>(validationResult.Errors, cancellationToken);
        }

        var utcNow = DateTime.UtcNow;
        var tokenHash = _jwtTokenService.ComputeTokenHash(request.Token.Trim());
        var existingToken = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);

        if (existingToken is null)
        {
            return BuildUnauthorizedResponse<LoginResponseDto>(
                AuthenticationMessageKeys.InvalidRefreshToken,
                "Refresh token is invalid or expired.");
        }

        if (existingToken.RevokedAtUtc is not null)
        {
            _logger.LogWarning(
                "Refresh token reuse detected for UserKinkId {UserKinkId}. Revoking all active sessions.",
                existingToken.UserKinkId);

            await _refreshTokenRepository.RevokeAllActiveByUserKinkIdAsync(
                existingToken.UserKinkId,
                utcNow,
                cancellationToken);

            return BuildUnauthorizedResponse<LoginResponseDto>(
                AuthenticationMessageKeys.RefreshTokenReused,
                "Refresh token reuse detected. All active sessions have been revoked.");
        }

        if (!existingToken.IsActive || existingToken.ExpiresAtUtc <= utcNow)
        {
            return BuildUnauthorizedResponse<LoginResponseDto>(
                AuthenticationMessageKeys.InvalidRefreshToken,
                "Refresh token is invalid or expired.");
        }

        var user = existingToken.UserKink ?? await _userKinkRepository.GetByIdAsync(existingToken.UserKinkId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return BuildUnauthorizedResponse<LoginResponseDto>(
                AuthenticationMessageKeys.UserInactive,
                "User account is inactive.");
        }

        var (newRawRefreshToken, newRefreshTokenHash) = _jwtTokenService.GenerateSecureRefreshToken();
        var refreshExpiresAtUtc = CalculateRefreshTokenExpiryUtc(utcNow);

        await _transactionExecutor.BeginAsync(cancellationToken);
        try
        {
            existingToken.RevokedAtUtc = utcNow;
            existingToken.ReplacedByTokenHash = newRefreshTokenHash;
            existingToken.Deactivate();
            await _refreshTokenRepository.UpdateAsync(existingToken, cancellationToken);

            var rotatedToken = new UserKinkRefreshToken
            {
                UserKinkId = user.Id,
                TokenHash = newRefreshTokenHash,
                ExpiresAtUtc = refreshExpiresAtUtc,
                CreatedByIp = remoteIp
            };
            await _refreshTokenRepository.AddAsync(rotatedToken, cancellationToken);

            await _transactionExecutor.CommitAsync(cancellationToken);
        }
        catch
        {
            await _transactionExecutor.RollbackAsync(CancellationToken.None);
            throw;
        }

        var accessToken = _jwtTokenService.GenerateAccessToken(user);
        var loginResponse = BuildLoginResponseDto(user, accessToken, newRawRefreshToken, refreshExpiresAtUtc, utcNow);

        _logger.LogInfo("Refresh token rotated successfully for UserKinkId {UserKinkId}.", user.Id);

        return ServiceResponse<LoginResponseDto>.Ok(
            loginResponse,
            _validationMessages.GetMessage(AuthenticationMessageKeys.TokenRefreshed, "Token refreshed successfully."),
            AuthenticationMessageKeys.TokenRefreshed);
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<bool>> LogoutAsync(
        long userKinkId,
        LogoutRequestDto request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        var utcNow = DateTime.UtcNow;

        if (request.RevokeAllSessions)
        {
            await _refreshTokenRepository.RevokeAllActiveByUserKinkIdAsync(userKinkId, utcNow, cancellationToken);
        }
        else if (!string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            var tokenHash = _jwtTokenService.ComputeTokenHash(request.RefreshToken.Trim());
            var token = await _refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);

            if (token is not null && token.UserKinkId == userKinkId && token.RevokedAtUtc is null)
            {
                token.RevokedAtUtc = utcNow;
                token.Deactivate();
                await _refreshTokenRepository.UpdateAsync(token, cancellationToken);
            }
        }

        _logger.LogInfo("Logout processed for UserKinkId {UserKinkId}.", userKinkId);

        return ServiceResponse<bool>.Ok(
            true,
            _validationMessages.GetMessage(AuthenticationMessageKeys.LogoutSuccessful, "Logout successful."),
            AuthenticationMessageKeys.LogoutSuccessful);
    }

    /// <inheritdoc />
    public async Task<ServiceResponse<UserKinkDto>> GetCurrentUserAsync(
        long userKinkId,
        CancellationToken cancellationToken = default)
    {
        var user = await _userKinkRepository.GetByIdAsync(userKinkId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return BuildUnauthorizedResponse<UserKinkDto>(
                AuthenticationMessageKeys.UserInactive,
                "User account is inactive.");
        }

        var dto = _mapper.Map<UserKinkDto>(user);

        return ServiceResponse<UserKinkDto>.Ok(
            dto,
            _validationMessages.GetMessage(
                AuthenticationMessageKeys.CurrentUserRetrieved,
                "Authenticated user retrieved successfully."),
            AuthenticationMessageKeys.CurrentUserRetrieved);
    }

    private async Task<UserKink?> AuthenticateUserAsync(
        string loginOrEmail,
        string password,
        CancellationToken cancellationToken)
    {
        var user = await _userKinkRepository.GetByLoginOrEmailAsync(loginOrEmail, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        return VerifyPassword(password, user.PasswordHash) ? user : null;
    }

    private bool VerifyPassword(string password, string hash)
    {
        var verificationInput = new PasswordVerificationInput
        {
            Password = password,
            Hash = hash
        };

        var verificationValidation = _passwordVerificationValidator.Validate(verificationInput);
        if (!verificationValidation.IsValid)
        {
            return false;
        }

        try
        {
            var hasher = PasswordHasherFactory.GetHasher(PasswordAlgorithm.Bcrypt);
            return hasher.VerifyPassword(password, hash);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying password hash.");
            return false;
        }
    }

    private DateTime CalculateRefreshTokenExpiryUtc(DateTime utcNow)
    {
        var days = _tokenConfig.DaysToExpiry > 0 ? _tokenConfig.DaysToExpiry : DefaultRefreshTokenDays;
        return utcNow.AddDays(days);
    }

    private DateTime ResolveAccessTokenExpiryUtc(string accessToken, DateTime utcNow)
    {
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            var handler = new JwtSecurityTokenHandler();
            if (handler.CanReadToken(accessToken))
            {
                var validTo = handler.ReadJwtToken(accessToken).ValidTo;
                if (validTo != DateTime.MinValue)
                {
                    return DateTime.SpecifyKind(validTo, DateTimeKind.Utc);
                }
            }
        }

        var minutes = _tokenConfig.Minutes > 0 ? _tokenConfig.Minutes : DefaultAccessTokenMinutes;
        return utcNow.AddMinutes(minutes);
    }

    private LoginResponseDto BuildLoginResponseDto(
        UserKink user,
        string accessToken,
        string rawRefreshToken,
        DateTime refreshExpiresAtUtc,
        DateTime utcNow)
    {
        var userDto = _mapper.Map<UserKinkDto>(user);
        var accessExpiresAtUtc = ResolveAccessTokenExpiryUtc(accessToken, utcNow);

        return new LoginResponseDto(
            AccessToken: accessToken,
            RefreshToken: rawRefreshToken,
            ExpiresAtUtc: accessExpiresAtUtc,
            RefreshTokenExpiresAtUtc: refreshExpiresAtUtc,
            User: userDto);
    }

    private async Task<ServiceResponse<T>> BuildValidationErrorResponseAsync<T>(
        IEnumerable<FluentValidation.Results.ValidationFailure> failures,
        CancellationToken cancellationToken)
    {
        var errors = await FluentValidationErrorMappingHelper.MapAsync(
            failures,
            _errorLocalizationService,
            "Validation",
            cancellationToken);

        return ServiceResponse<T>.Error(
            errors,
            _validationMessages.GetMessage(ValidationMessageKeys.Failed, "Validation failed."),
            ValidationMessageKeys.Failed);
    }

    private ServiceResponse<T> BuildLocalizedFailResponse<T>(
        string messageKey,
        string fallbackMessage,
        int statusCode)
    {
        var localized = _validationMessages.GetMessage(messageKey, fallbackMessage);
        var response = ServiceResponse<T>.Fail(messageKey, statusCode);
        response.Message = localized;

        if (response.Errors.Count > 0)
        {
            response.Errors[0].Description = localized;
            response.Errors[0].DefaultMessage = localized;
        }

        return response;
    }

    private ServiceResponse<T> BuildUnauthorizedResponse<T>(string messageKey, string fallbackMessage)
    {
        var localized = _validationMessages.GetMessage(messageKey, fallbackMessage);
        var response = ServiceResponse<T>.UnauthorizedResponse(localized);
        response.MessageKey = messageKey;

        if (response.Errors.Count > 0)
        {
            response.Errors[0].MessageKey = messageKey;
        }

        return response;
    }
}
