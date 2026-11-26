using KinkConsentManager.Core.Domain.DTOs.Authentication;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Domain.Interfaces.Services;

/// <summary>
/// Contrato do serviço de autenticação, cadastro, renovação JWT e encerramento de sessão.
/// </summary>
public interface IAuthenticationService
{
    /// <summary>Cadastra um novo usuário com validação de unicidade e hash BCrypt.</summary>
    Task<ServiceResponse<UserKinkDto>> RegisterAsync(
        RegisterUserKinkRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>Autentica por login ou e-mail e emite AccessToken HS512 e RefreshToken.</summary>
    Task<ServiceResponse<LoginResponseDto>> LoginAsync(
        LoginDto request,
        string? remoteIp = null,
        CancellationToken cancellationToken = default);

    /// <summary>Renova a sessão aplicando Refresh Token Rotation e Reuse Detection.</summary>
    Task<ServiceResponse<LoginResponseDto>> RefreshTokenAsync(
        RefreshTokenDto request,
        string? remoteIp = null,
        CancellationToken cancellationToken = default);

    /// <summary>Revoga o refresh token atual ou todas as sessões ativas do usuário autenticado.</summary>
    Task<ServiceResponse<bool>> LogoutAsync(
        long userKinkId,
        LogoutRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>Obtém os dados cadastrais do usuário autenticado.</summary>
    Task<ServiceResponse<UserKinkDto>> GetCurrentUserAsync(
        long userKinkId,
        CancellationToken cancellationToken = default);
}
