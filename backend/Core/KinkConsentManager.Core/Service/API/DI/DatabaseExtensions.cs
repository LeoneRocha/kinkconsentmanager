using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SmartCoreHub.Core.SDK.Application.Transactions;
using SmartCoreHub.Core.SDK.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.Infrastructure.Data;
using SmartCoreHub.Core.SDK.Infrastructure.Data.Configurations;
using SmartCoreHub.Core.SDK.Infrastructure.Data.DependencyInjection;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Registro do contexto Entity Framework Core (<see cref="KinkConsentManagerDbContext"/>),
/// provedores PostgreSQL/InMemory, escopo e executor transacional.
/// </summary>
public static class DatabaseExtensions
{
    private static readonly string MigrationsAssemblyName =
        typeof(KinkConsentManagerDbContext).Assembly.GetName().Name!;

    /// <summary>
    /// Registra o <see cref="KinkConsentManagerDbContext"/> conforme o provedor configurado em <c>DatabaseProvider</c>,
    /// além de <see cref="ITransactionExecutor"/> e <see cref="IKinkConsentManagerDbScope"/>.
    /// </summary>
    /// <param name="services">Coleção de serviços da aplicação.</param>
    /// <param name="configuration">Configuração contendo <c>DatabaseProvider</c> e <c>ConnectionStrings:DefaultConnection</c>.</param>
    /// <returns>A mesma coleção de serviços para encadeamento.</returns>
    /// <exception cref="InvalidOperationException">Lançada quando o provedor de banco informado não é suportado.</exception>
    public static IServiceCollection AddDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(configuration);

        var connectionString = PostgreSqlConnectionStringNormalizer.Normalize(
            configuration.GetConnectionString("DefaultConnection"));
        var provider = configuration.GetValue("DatabaseProvider", DatabaseProviderNameHelper.PostgreSql);
        var normalizedProvider = DatabaseProviderNameHelper.Normalize(provider);

        switch (normalizedProvider)
        {
            case DatabaseProviderNameHelper.InMemory:
                services.AddConfiguredDbContext<KinkConsentManagerDbContext>(options =>
                    options.UseInMemoryDatabase("KinkConsentManagerTestDb"));
                break;

            case DatabaseProviderNameHelper.PostgreSql:
                services.AddConfiguredDbContext<KinkConsentManagerDbContext, KinkConsentManagerDbContextPostgreSql>(options =>
                    options.UseNpgsql(
                        connectionString,
                        x =>
                        {
                            x.MigrationsAssembly(MigrationsAssemblyName);
                            x.MigrationsHistoryTable(
                                EfMigrationsHistoryHelper.PostgreSqlTable,
                                KinkConsentManagerDbContext.DefaultSchema);
                        }));
                break;

            default:
                throw new InvalidOperationException(
                    DatabaseProviderNameHelper.BuildUnsupportedProviderMessage(provider));
        }

        services.Replace(ServiceDescriptor.Scoped<ITransactionExecutor, EfTransactionExecutor>());
        services.TryAddScoped<IKinkConsentManagerDbScope>(sp =>
        {
            var context = sp.GetRequiredService<KinkConsentManagerDbContext>();
            var factory = sp.GetService<IDbContextFactory<KinkConsentManagerDbContext>>();
            return new KinkConsentManagerDbContextScope(context, factory);
        });
        services.TryAddScoped<IEfDbContextScope<KinkConsentManagerDbContext>>(
            sp => sp.GetRequiredService<IKinkConsentManagerDbScope>());

        return services;
    }
}
