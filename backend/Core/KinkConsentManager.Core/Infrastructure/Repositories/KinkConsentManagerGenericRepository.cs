using KinkConsentManager.Core.Infrastructure.Data;
using SmartCoreHub.Core.SDK.Domain.Entities.Common;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.EntityFrameworkCore.Repositories;

namespace KinkConsentManager.Core.Infrastructure.Repositories;

/// <summary>
/// Binding open-generic de DI sobre o repositório genérico do <c>SmartCoreHub.Core.SDK</c>.
/// </summary>
/// <typeparam name="TEntity">Tipo da entidade persistida derivada de <see cref="LongEntityBase"/>.</typeparam>
public sealed class KinkConsentManagerGenericRepository<TEntity>
    : GenericRepository<TEntity, KinkConsentManagerDbContext>
    where TEntity : LongEntityBase
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="KinkConsentManagerGenericRepository{TEntity}"/>.
    /// </summary>
    /// <param name="dbScope">Escopo EF Core do contexto <see cref="KinkConsentManagerDbContext"/>.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    public KinkConsentManagerGenericRepository(IKinkConsentManagerDbScope dbScope, IAppLogger logger)
        : base(dbScope, logger)
    {
    }
}
