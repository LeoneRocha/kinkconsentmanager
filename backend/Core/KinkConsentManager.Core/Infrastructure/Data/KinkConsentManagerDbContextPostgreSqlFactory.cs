using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using SmartCoreHub.Core.SDK.Infrastructure.Data;

namespace KinkConsentManager.Core.Infrastructure.Data;

/// <summary>
/// Fábrica design-time para criação e aplicação de migrations no PostgreSQL/Supabase.
/// </summary>
public sealed class KinkConsentManagerDbContextPostgreSqlFactory
    : IDesignTimeDbContextFactory<KinkConsentManagerDbContextPostgreSql>
{
    private const string DesignTimeFallbackConnectionString =
        "Host=127.0.0.1;Port=5432;Database=kinkconsentmanager;Username=postgres";

    /// <summary>
    /// Cria uma instância de <see cref="KinkConsentManagerDbContextPostgreSql"/> em tempo de design para ferramentas EF Core.
    /// </summary>
    /// <param name="args">Argumentos de linha de comando recebidos pelo EF Core CLI.</param>
    /// <returns>Instância configurada de <see cref="KinkConsentManagerDbContextPostgreSql"/>.</returns>
    public KinkConsentManagerDbContextPostgreSql CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = DesignTimeDatabaseBootstrap.ConnectionStringOrFallback(
            DesignTimeDatabaseBootstrap.GetConnectionString(configuration),
            DesignTimeFallbackConnectionString);

        var builder = new DbContextOptionsBuilder<KinkConsentManagerDbContextPostgreSql>();
        builder.UseNpgsql(connectionString, options =>
        {
            options.MigrationsAssembly(typeof(KinkConsentManagerDbContext).Assembly.GetName().Name!);
            options.MigrationsHistoryTable(
                EfMigrationsHistoryHelper.PostgreSqlTable,
                KinkConsentManagerDbContext.DefaultSchema);
        });

        return new KinkConsentManagerDbContextPostgreSql(builder.Options);
    }
}
