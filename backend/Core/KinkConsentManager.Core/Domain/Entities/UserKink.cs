using KinkConsentManager.Core.Domain.Security;
using SmartCoreHub.Core.SDK.Domain.Entities.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Domain.Entities;

/// <summary>
/// Entidade de usuário da plataforma KinkConsentManager (somente dados e estado de domínio).
/// </summary>
public class UserKink : LongEntityBase
{
    /// <summary>Identificador único de login (preserva grafia original de exibição).</summary>
    public string Login { get; set; } = string.Empty;

    /// <summary>Login normalizado em minúsculas para unicidade e busca indexada case-insensitive no PostgreSQL.</summary>
    public string NormalizedLogin { get; set; } = string.Empty;

    /// <summary>Hash criptográfico SHA-256 do e-mail normalizado do usuário (LGPD — e-mail em texto plano nunca é persistido).</summary>
    public string EmailHash { get; set; } = string.Empty;

    /// <summary>Hash criptográfico BCrypt da senha do usuário (com salt embutido).</summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>Data e hora (UTC) do último login bem-sucedido.</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Coleção de refresh tokens emitidos para as sessões do usuário.</summary>
    public virtual ICollection<UserKinkRefreshToken> RefreshTokens { get; set; } = new List<UserKinkRefreshToken>();

    /// <summary>Relatório de respostas do checklist sincronizado na nuvem (Etapa 2).</summary>
    public virtual UserKinkCheclist? Checklist { get; set; }

    /// <summary>Define o login de exibição e mantém <see cref="NormalizedLogin"/> sincronizado.</summary>
    /// <param name="login">Login informado pelo usuário.</param>
    public void SetLogin(string login)
    {
        Login = (login ?? string.Empty).Trim();
        NormalizedLogin = Login.ToLowerInvariant();
    }

    /// <summary>Calcula e armazena apenas o hash irreversível do Value Object <see cref="Email"/> (LGPD).</summary>
    /// <param name="email">Value Object de e-mail validado e normalizado.</param>
    public void SetEmail(Email email)
    {
        EmailHash = EmailHashHelper.ComputeHash(email);
    }

    /// <summary>Valida, normaliza e armazena apenas o hash irreversível do e-mail informado (LGPD).</summary>
    /// <param name="rawEmail">Endereço de e-mail em texto plano.</param>
    public void SetEmail(string rawEmail)
    {
        EmailHash = EmailHashHelper.ComputeHash(rawEmail);
    }
}
