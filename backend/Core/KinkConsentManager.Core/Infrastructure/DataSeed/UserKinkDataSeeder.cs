using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace KinkConsentManager.Core.Infrastructure.DataSeed;

/// <summary>
/// Integra os usuários determinísticos de exemplo ao modelo do EF Core (<c>HasData</c>).
/// </summary>
public static class UserKinkDataSeeder
{
    /// <summary>
    /// Registra os usuários retornados por <see cref="UserKinkMockData"/> com <c>HasData</c>.
    /// A chamada altera apenas os metadados do modelo; a aplicação das migrations ou inicialização do banco controla a persistência.
    /// </summary>
    /// <param name="modelBuilder">Construtor do modelo EF Core.</param>
    public static void Seed(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);
        modelBuilder.Entity<UserKink>().HasData(UserKinkMockData.GetMock());
    }
}
