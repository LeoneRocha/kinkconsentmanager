using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Infrastructure.Data.Configurations;

/// <summary>
/// Configuração Fluent API da entidade <see cref="UserKink"/> para o schema <c>kink_consent</c>.
/// </summary>
public sealed class UserKinkConfiguration : IEntityTypeConfiguration<UserKink>
{
    /// <summary>
    /// Configura tabela, colunas, conversores de Value Object e índices de <see cref="UserKink"/>.
    /// </summary>
    /// <param name="entity">Construtor de metadados da entidade <see cref="UserKink"/>.</param>
    public void Configure(EntityTypeBuilder<UserKink> entity)
    {
        entity.ToTable("UserKinks");
        entity.HasKey(u => u.Id);
        entity.Property(u => u.Id).ValueGeneratedOnAdd();

        entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
        entity.Property(u => u.Login).IsRequired().HasMaxLength(50);
        entity.Property(u => u.NormalizedLogin).IsRequired().HasMaxLength(50);
        entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(500);
        entity.Property(u => u.CreatedAt).IsRequired();
        entity.Property(u => u.UpdatedAt).IsRequired();
        entity.Property(u => u.IsActive).IsRequired().HasDefaultValue(true);
        entity.Property(u => u.LastLoginAt).IsRequired(false);

        // Conversão do Value Object Email do SmartCoreHub.Core.SDK (sempre em minúsculas).
        entity.Property(u => u.Email)
            .HasConversion(
                email => email.Value,
                value => new Email(value))
            .IsRequired()
            .HasMaxLength(191);

        // No PostgreSQL (Supabase), colunas varchar e índices UNIQUE são case-sensitive por padrão;
        // NormalizedLogin + Email VO garantem unicidade e busca rápida B-Tree case-insensitive.
        entity.HasIndex(u => u.Email).IsUnique().HasDatabaseName("IX_UserKinks_Email");
        entity.HasIndex(u => u.NormalizedLogin).IsUnique().HasDatabaseName("IX_UserKinks_NormalizedLogin");
        entity.HasIndex(u => u.Login).IsUnique().HasDatabaseName("IX_UserKinks_Login");
        entity.HasIndex(u => u.IsActive).HasDatabaseName("IX_UserKinks_IsActive");
    }
}
