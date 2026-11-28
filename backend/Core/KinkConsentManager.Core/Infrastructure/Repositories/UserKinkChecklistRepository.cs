using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.EntityFrameworkCore.Repositories;

namespace KinkConsentManager.Core.Infrastructure.Repositories;

/// <summary>
/// Repositório EF Core para persistência 1:1 do checklist on-line em <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
public sealed class UserKinkChecklistRepository
    : GenericRepository<UserKinkCheclist, KinkConsentManagerDbContext>, IUserKinkChecklistRepository
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="UserKinkChecklistRepository"/>.
    /// </summary>
    /// <param name="dbScope">Escopo EF Core do contexto <see cref="KinkConsentManagerDbContext"/>.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    public UserKinkChecklistRepository(IKinkConsentManagerDbScope dbScope, IAppLogger logger)
        : base(dbScope, logger)
    {
    }

    /// <inheritdoc />
    public Task<UserKinkCheclist?> GetByUserKinkIdAsync(long userKinkId, CancellationToken cancellationToken = default)
    {
        if (userKinkId <= 0)
        {
            return Task.FromResult<UserKinkCheclist?>(null);
        }

        return _dbSet.FirstOrDefaultAsync(c => c.UserKinkId == userKinkId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<bool> DeleteByUserKinkIdAsync(long userKinkId, CancellationToken cancellationToken = default)
    {
        var existing = await GetByUserKinkIdAsync(userKinkId, cancellationToken);
        if (existing is null)
        {
            return false;
        }

        _dbSet.Remove(existing);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
