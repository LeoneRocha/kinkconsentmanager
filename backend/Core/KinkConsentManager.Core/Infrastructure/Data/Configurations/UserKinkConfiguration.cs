using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KinkConsentManager.Core.Infrastructure.Data.Configurations;

/// <summary>
/// Configuração Fluent API da entidade <see cref="UserKink"/> para o schema <c>kink_consent</c>.
/// </summary>
public sealed class UserKinkConfiguration : IEntityTypeConfiguration<UserKink>
{
    /// <summary>
    /// Configura tabela, colunas, hashes LGPD e índices de <see cref="UserKink"/>.
    /// </summary>
    /// <param name="entity">Construtor de metadados da entidade <see cref="UserKink"/>.</param>
    public void Configure(EntityTypeBuilder<UserKink> entity)
    {
        entity.ToTable("UserKinks");
        entity.HasKey(u => u.Id);
        entity.Property(u => u.Id).ValueGeneratedOnAdd();

        entity.Property(u => u.Login).IsRequired().HasMaxLength(50);
        entity.Property(u => u.NormalizedLogin).IsRequired().HasMaxLength(50);
        entity.Property(u => u.EmailHash).IsRequired().HasMaxLength(128);
        entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(500);
        entity.Property(u => u.CreatedAt).IsRequired();
        entity.Property(u => u.UpdatedAt).IsRequired();
        entity.Property(u => u.IsActive).IsRequired().HasDefaultValue(true);
        entity.Property(u => u.LastLoginAt).IsRequired(false);

        // No PostgreSQL (Supabase), índices UNIQUE em EmailHash e NormalizedLogin garantem unicidade e busca B-Tree case-insensitive sem expor o e-mail em texto plano (LGPD).
        entity.HasIndex(u => u.EmailHash).IsUnique().HasDatabaseName("IX_UserKinks_EmailHash");
        entity.HasIndex(u => u.NormalizedLogin).IsUnique().HasDatabaseName("IX_UserKinks_NormalizedLogin");
        entity.HasIndex(u => u.Login).IsUnique().HasDatabaseName("IX_UserKinks_Login");
        entity.HasIndex(u => u.IsActive).HasDatabaseName("IX_UserKinks_IsActive");
    }
}
