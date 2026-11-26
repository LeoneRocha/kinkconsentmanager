using SmartCoreHub.Core.SDK.Domain.Entities.Common;

namespace KinkConsentManager.Core.Domain.Entities;

/// <summary>
/// Persiste o hash SHA-256 do refresh token emitido para suportar rotação e detecção de reúso.
/// </summary>
public class UserKinkRefreshToken : LongEntityBase
{
    /// <summary>Identificador do usuário proprietário da sessão.</summary>
    public long UserKinkId { get; set; }

    /// <summary>Hash SHA-256 (hexadecimal) do refresh token; o segredo bruto nunca é salvo.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Data e hora (UTC) de expiração do token.</summary>
    public DateTime ExpiresAtUtc { get; set; }

    /// <summary>Data e hora (UTC) da revogação manual ou por rotação.</summary>
    public DateTime? RevokedAtUtc { get; set; }

    /// <summary>Hash do token substituto gerado durante a rotação (auditoria e Reuse Detection).</summary>
    public string? ReplacedByTokenHash { get; set; }

    /// <summary>IP de origem que solicitou a emissão do token (opcional).</summary>
    public string? CreatedByIp { get; set; }

    /// <summary>Usuário proprietário do token.</summary>
    public virtual UserKink UserKink { get; set; } = null!;

    /// <summary>Indica se o token permanece válido para renovação no instante informado.</summary>
    /// <param name="utcNow">Instante UTC de referência.</param>
    /// <returns><c>true</c> quando ativo, não revogado e não expirado; caso contrário, <c>false</c>.</returns>
    public bool IsValidForRefresh(DateTime utcNow) =>
        IsActive && RevokedAtUtc == null && ExpiresAtUtc > utcNow;
}
