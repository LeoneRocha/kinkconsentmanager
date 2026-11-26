using SmartCoreHub.Core.SDK.Domain.Entities.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Domain.Entities;

/// <summary>
/// Entidade de usuário da plataforma KinkConsentManager (somente dados e estado de domínio).
/// </summary>
public class UserKink : LongEntityBase
{
    /// <summary>Nome ou pseudônimo de exibição do usuário.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Identificador único de login (preserva grafia original de exibição).</summary>
    public string Login { get; set; } = string.Empty;

    /// <summary>Login normalizado em minúsculas para unicidade e busca indexada case-insensitive no PostgreSQL.</summary>
    public string NormalizedLogin { get; set; } = string.Empty;

    /// <summary>Value Object de e-mail validado e normalizado em minúsculas pelo SmartCoreHub.Core.SDK.</summary>
    public Email Email { get; set; } = null!;

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
}
