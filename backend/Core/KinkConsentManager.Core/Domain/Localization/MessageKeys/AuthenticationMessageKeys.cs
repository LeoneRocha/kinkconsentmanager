namespace KinkConsentManager.Core.Domain.Localization.MessageKeys;

/// <summary>
/// Chaves canônicas de mensagens funcionais do fluxo de autenticação e conta.
/// </summary>
public static class AuthenticationMessageKeys
{
    /// <summary>Usuário cadastrado com sucesso.</summary>
    public const string UserRegistered = "Auth.UserRegistered";

    /// <summary>Autenticação concluída com sucesso.</summary>
    public const string LoginSuccessful = "Auth.LoginSuccessful";

    /// <summary>Sessão renovada com sucesso.</summary>
    public const string TokenRefreshed = "Auth.TokenRefreshed";

    /// <summary>Logout concluído com sucesso.</summary>
    public const string LogoutSuccessful = "Auth.LogoutSuccessful";

    /// <summary>Perfil do usuário autenticado obtido com sucesso.</summary>
    public const string CurrentUserRetrieved = "Auth.CurrentUserRetrieved";

    /// <summary>Credenciais inválidas (anti-enumeração).</summary>
    public const string InvalidCredentials = "Auth.InvalidCredentials";

    /// <summary>Conta inativa.</summary>
    public const string UserInactive = "Auth.UserInactive";

    /// <summary>Refresh token inválido ou expirado.</summary>
    public const string InvalidRefreshToken = "Auth.InvalidRefreshToken";

    /// <summary>Reúso de refresh token detectado; todas as sessões foram revogadas.</summary>
    public const string RefreshTokenReused = "Auth.RefreshTokenReused";

    /// <summary>Login já cadastrado.</summary>
    public const string LoginAlreadyExists = "Auth.LoginAlreadyExists";

    /// <summary>E-mail já cadastrado.</summary>
    public const string EmailAlreadyExists = "Auth.EmailAlreadyExists";
}
