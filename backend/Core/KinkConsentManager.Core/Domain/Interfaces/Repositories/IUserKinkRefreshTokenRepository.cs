using KinkConsentManager.Core.Domain.Entities;
using SmartCoreHub.Core.SDK.Infrastructure.Repositories.Generic;

namespace KinkConsentManager.Core.Domain.Interfaces.Repositories;

/// <summary>
/// Contrato de repositório para gerenciamento de refresh tokens com suporte a rotação e Reuse Detection.
/// </summary>
public interface IUserKinkRefreshTokenRepository : IGenericRepository<UserKinkRefreshToken>
{
    /// <summary>Obtém um refresh token pelo digest SHA-256, incluindo a entidade <see cref="UserKink"/> associada.</summary>
    Task<UserKinkRefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);

    /// <summary>Revoga todos os refresh tokens ainda ativos de um usuário específico.</summary>
    Task RevokeAllActiveByUserKinkIdAsync(long userKinkId, DateTime revokedAtUtc, CancellationToken cancellationToken = default);
}
