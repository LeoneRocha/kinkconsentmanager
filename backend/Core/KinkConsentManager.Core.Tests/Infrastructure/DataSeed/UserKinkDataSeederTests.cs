using KinkConsentManager.Core.Domain.Security;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Infrastructure.DataSeed;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;

namespace KinkConsentManager.Core.Tests.Infrastructure.DataSeed;

[TestFixture]
public sealed class UserKinkDataSeederTests
{
    [Test]
    public void GetMock_ShouldReturnDeterministicUsers()
    {
        // Cenário: Obtenção de usuários mock de seed para UserKink.
        // Objetivo: Garantir que a lista possua os usuários determinísticos esperados (admin e demo user.kink) com hash LGPD de e-mail.
        var users = UserKinkMockData.GetMock().ToList();

        Assert.That(users, Is.Not.Null);
        Assert.That(users, Has.Count.EqualTo(2));

        var admin = users.Single(u => u.Id == UserKinkMockData.UserIds.Admin);
        Assert.That(admin.Login, Is.EqualTo("admin"));
        Assert.That(admin.NormalizedLogin, Is.EqualTo("admin"));
        Assert.That(admin.EmailHash, Is.EqualTo(UserKinkMockData.SeedAdminEmailHash));
        Assert.That(EmailHashHelper.VerifyEmail("admin@kinkconsentmanager.local", admin.EmailHash), Is.True);
        Assert.That(admin.PasswordHash, Is.EqualTo(UserKinkMockData.SeedAdminPasswordHash));
        Assert.That(admin.IsActive, Is.True);
        Assert.That(admin.CreatedAt, Is.EqualTo(UserKinkMockData.SeedTimestamp));

        var demo = users.Single(u => u.Id == UserKinkMockData.UserIds.DemoUserKink);
        Assert.That(demo.Login, Is.EqualTo("user.kink"));
        Assert.That(demo.NormalizedLogin, Is.EqualTo("user.kink"));
        Assert.That(demo.EmailHash, Is.EqualTo(UserKinkMockData.SeedUserKinkEmailHash));
        Assert.That(EmailHashHelper.VerifyEmail("user.kink@kinkconsentmanager.local", demo.EmailHash), Is.True);
        Assert.That(demo.PasswordHash, Is.EqualTo(UserKinkMockData.SeedUserKinkPasswordHash));
        Assert.That(demo.IsActive, Is.True);
        Assert.That(demo.CreatedAt, Is.EqualTo(UserKinkMockData.SeedTimestamp));
    }

    [Test]
    public void Seed_WhenModelBuilderIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Chamada de Seed passando modelBuilder nulo.
        // Objetivo: Garantir validação de parâmetros contra nulos.
        Assert.Throws<ArgumentNullException>(() => UserKinkDataSeeder.Seed(null!));
    }

    [Test]
    public void Seed_WithDbContextModelCreation_ShouldApplySeedSuccessfully()
    {
        // Cenário: Inicialização de DbContext com o ModelBuilder executando UserKinkDataSeeder.
        // Objetivo: Garantir que o OnModelCreating processe as entidades de seed sem exceções.
        var options = new DbContextOptionsBuilder<KinkConsentManagerDbContext>()
            .UseInMemoryDatabase(databaseName: $"SeedValidationDb_{Guid.NewGuid()}")
            .Options;

        Assert.DoesNotThrow(() =>
        {
            using var context = new KinkConsentManagerDbContext(options);
            var model = context.Model;
            var entityType = model.FindEntityType(typeof(KinkConsentManager.Core.Domain.Entities.UserKink));
            Assert.That(entityType, Is.Not.Null);
        });
    }
}
