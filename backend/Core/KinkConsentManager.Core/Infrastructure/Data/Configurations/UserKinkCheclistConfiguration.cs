using KinkConsentManager.Core.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace KinkConsentManager.Core.Infrastructure.Data.Configurations;

/// <summary>
/// Configuração Fluent API da entidade <see cref="UserKinkCheclist"/> para o schema <c>kink_consent</c>.
/// </summary>
public sealed class UserKinkCheclistConfiguration : IEntityTypeConfiguration<UserKinkCheclist>
{
    /// <summary>
    /// Configura tabela, coluna <c>jsonb</c>, controle de concorrência otimista, índices e relacionamento 1:1 com <see cref="UserKink"/>.
    /// </summary>
    /// <param name="entity">Construtor de metadados da entidade <see cref="UserKinkCheclist"/>.</param>
    public void Configure(EntityTypeBuilder<UserKinkCheclist> entity)
    {
        entity.ToTable("UserKinkCheclists");
        entity.HasKey(r => r.Id);
        entity.Property(r => r.Id).ValueGeneratedOnAdd();

        entity.Property(r => r.AnswersJson).HasColumnType("jsonb").IsRequired();
        entity.Property(r => r.SchemaVersion).HasMaxLength(20).IsRequired();
        entity.Property(r => r.Language).HasMaxLength(10).IsRequired();
        entity.Property(r => r.ClientUpdatedAtUtc).IsRequired();
        entity.Property(r => r.Version).IsConcurrencyToken().HasDefaultValue(1);
        entity.Property(r => r.CreatedAt).IsRequired();
        entity.Property(r => r.UpdatedAt).IsRequired();
        entity.Property(r => r.IsActive).IsRequired().HasDefaultValue(true);

        entity.HasIndex(r => r.UserKinkId).IsUnique().HasDatabaseName("IX_UserKinkCheclists_UserKinkId");
        entity.HasIndex(r => r.AnswersJson)
            .HasDatabaseName("IX_UserKinkCheclists_AnswersJson_Gin")
            .HasAnnotation("Npgsql:IndexMethod", "gin");

        entity.HasOne(r => r.UserKink)
            .WithOne(u => u.Checklist)
            .HasForeignKey<UserKinkCheclist>(r => r.UserKinkId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
