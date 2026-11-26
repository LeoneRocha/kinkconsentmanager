using Microsoft.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.EntityFrameworkCore;

namespace KinkConsentManager.Core.Infrastructure.Data;

/// <summary>
/// Contrato de escopo EF Core específico para o contexto <see cref="KinkConsentManagerDbContext"/>.
/// </summary>
public interface IKinkConsentManagerDbScope : IEfDbContextScope<KinkConsentManagerDbContext>
{
}

/// <summary>
/// Implementação do escopo EF Core para <see cref="KinkConsentManagerDbContext"/> baseada em <see cref="EfDbContextScope{TContext}"/>.
/// </summary>
public sealed class KinkConsentManagerDbContextScope
    : EfDbContextScope<KinkConsentManagerDbContext>, IKinkConsentManagerDbScope
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="KinkConsentManagerDbContextScope"/>.
    /// </summary>
    /// <param name="context">Instância ambiente de <see cref="KinkConsentManagerDbContext"/>.</param>
    /// <param name="factory">Fábrica opcional para criação de contextos auxiliares de curta duração.</param>
    /// <param name="options">Opções opcionais do contexto quando a fábrica não for informada.</param>
    public KinkConsentManagerDbContextScope(
        KinkConsentManagerDbContext context,
        IDbContextFactory<KinkConsentManagerDbContext>? factory = null,
        DbContextOptions? options = null)
        : base(context, factory, options)
    {
    }
}
