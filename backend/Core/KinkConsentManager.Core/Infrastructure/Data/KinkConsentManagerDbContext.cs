using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KinkConsentManager.Core.Infrastructure.Data;

/// <summary>
/// Contexto EF Core principal do KinkConsentManager com isolamento no schema <c>kink_consent</c>.
/// </summary>
public class KinkConsentManagerDbContext : DbContext
{
    /// <summary>
    /// Nome do schema padrão isolado no PostgreSQL/Supabase.
    /// </summary>
    public const string DefaultSchema = "kink_consent";

    /// <summary>
    /// Inicializa uma nova instância de <see cref="KinkConsentManagerDbContext"/>.
    /// </summary>
    /// <param name="options">Opções de configuração do contexto EF Core.</param>
    public KinkConsentManagerDbContext(DbContextOptions options) : base(options)
    {
    }

    /// <summary>
    /// Conjunto de entidades de usuários da plataforma.
    /// </summary>
    public DbSet<UserKink> UserKinks => Set<UserKink>();

    /// <summary>
    /// Conjunto de entidades de refresh tokens persistidos.
    /// </summary>
    public DbSet<UserKinkRefreshToken> UserKinkRefreshTokens => Set<UserKinkRefreshToken>();

    /// <summary>
    /// Conjunto de entidades de relatórios/checklists dos usuários.
    /// </summary>
    public DbSet<UserKinkCheclist> UserKinkCheclists => Set<UserKinkCheclist>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema(DefaultSchema);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(KinkConsentManagerDbContext).Assembly);
    }
}

/// <summary>
/// Contexto tipado para PostgreSQL/Supabase com cadeia de migrations isolada em <c>Migrations/PostgreSql</c>.
/// </summary>
public sealed class KinkConsentManagerDbContextPostgreSql : KinkConsentManagerDbContext
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="KinkConsentManagerDbContextPostgreSql"/>.
    /// </summary>
    /// <param name="options">Opções tipadas para o provedor PostgreSQL.</param>
    public KinkConsentManagerDbContextPostgreSql(DbContextOptions<KinkConsentManagerDbContextPostgreSql> options)
        : base(options)
    {
    }
}
