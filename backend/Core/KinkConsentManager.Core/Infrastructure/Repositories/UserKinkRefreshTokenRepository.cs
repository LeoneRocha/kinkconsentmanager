using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.EntityFrameworkCore.Repositories;

namespace KinkConsentManager.Core.Infrastructure.Repositories;

/// <summary>
/// Repositório de refresh tokens com suporte a busca com carregamento de usuário e revogação em lote por sessão.
/// </summary>
public sealed class UserKinkRefreshTokenRepository
    : GenericRepository<UserKinkRefreshToken, KinkConsentManagerDbContext>, IUserKinkRefreshTokenRepository
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="UserKinkRefreshTokenRepository"/>.
    /// </summary>
    /// <param name="dbScope">Escopo EF Core do contexto <see cref="KinkConsentManagerDbContext"/>.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    public UserKinkRefreshTokenRepository(IKinkConsentManagerDbScope dbScope, IAppLogger logger)
        : base(dbScope, logger)
    {
    }

    /// <inheritdoc />
    public Task<UserKinkRefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return Task.FromResult<UserKinkRefreshToken?>(null);
        }

        return _dbSet
            .Include(t => t.UserKink)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);
    }

    /// <inheritdoc />
    public async Task RevokeAllActiveByUserKinkIdAsync(
        long userKinkId,
        DateTime revokedAtUtc,
        CancellationToken cancellationToken = default)
    {
        var activeTokens = await _dbSet
            .Where(t => t.UserKinkId == userKinkId && t.IsActive && t.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);

        if (activeTokens.Count == 0)
        {
            return;
        }

        foreach (var token in activeTokens)
        {
            token.RevokedAtUtc = revokedAtUtc;
            token.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
