using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KinkConsentManager.Core.Infrastructure.Data.Configurations;

/// <summary>
/// Configuração Fluent API da entidade <see cref="UserKinkRefreshToken"/> para o schema <c>kink_consent</c>.
/// </summary>
public sealed class UserKinkRefreshTokenConfiguration : IEntityTypeConfiguration<UserKinkRefreshToken>
{
    /// <summary>
    /// Configura tabela, colunas, índices e relacionamento com <see cref="UserKink"/>.
    /// </summary>
    /// <param name="entity">Construtor de metadados da entidade <see cref="UserKinkRefreshToken"/>.</param>
    public void Configure(EntityTypeBuilder<UserKinkRefreshToken> entity)
    {
        entity.ToTable("UserKinkRefreshTokens");
        entity.HasKey(t => t.Id);
        entity.Property(t => t.Id).ValueGeneratedOnAdd();

        entity.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
        entity.Property(t => t.ReplacedByTokenHash).IsRequired(false).HasMaxLength(128);
        entity.Property(t => t.CreatedByIp).IsRequired(false).HasMaxLength(64);
        entity.Property(t => t.ExpiresAtUtc).IsRequired();
        entity.Property(t => t.RevokedAtUtc).IsRequired(false);
        entity.Property(t => t.CreatedAt).IsRequired();
        entity.Property(t => t.UpdatedAt).IsRequired();
        entity.Property(t => t.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(t => t.TokenHash).IsUnique().HasDatabaseName("IX_UserKinkRefreshTokens_TokenHash");
        entity.HasIndex(t => t.UserKinkId).HasDatabaseName("IX_UserKinkRefreshTokens_UserKinkId");

        entity.HasOne(t => t.UserKink)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(t => t.UserKinkId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
