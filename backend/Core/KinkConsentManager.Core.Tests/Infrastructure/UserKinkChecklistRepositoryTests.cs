using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;

namespace KinkConsentManager.Core.Tests.Infrastructure;

[TestFixture]
public sealed class UserKinkChecklistRepositoryTests
{
    private KinkConsentManagerDbContext _dbContext = null!;
    private KinkConsentManagerDbContextScope _dbScope = null!;
    private UserKinkChecklistRepository _repository = null!;
    private long _userId;

    [SetUp]
    public async Task SetUp()
    {
        var options = new DbContextOptionsBuilder<KinkConsentManagerDbContext>()
            .UseInMemoryDatabase($"UserKinkChecklistRepoTests_{Guid.NewGuid():N}")
            .Options;

        _dbContext = new KinkConsentManagerDbContext(options);
        _dbScope = new KinkConsentManagerDbContextScope(_dbContext, options: options);
        _repository = new UserKinkChecklistRepository(_dbScope, NullAppLogger.Instance);

        var user = new UserKink
        {
            PasswordHash = "$2a$11$hashedpasswordvalue",
            IsActive = true
        };
        user.SetLogin("checklist_owner");
        user.SetEmail("checklist_owner@example.com");

        _dbContext.UserKinks.Add(user);
        await _dbContext.SaveChangesAsync();
        _userId = user.Id;
    }

    [TearDown]
    public void TearDown()
    {
        _dbContext.Dispose();
    }

    [Test]
    public async Task GetByUserKinkIdAsync_WhenChecklistExists_ShouldReturnChecklist()
    {
        // Cenário: Usuário possui registro único salvo em UserKinkCheclists.
        // Objetivo: Garantir que GetByUserKinkIdAsync retorne a entidade correspondente.
        var entity = new UserKinkCheclist
        {
            UserKinkId = _userId,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            ClientUpdatedAtUtc = DateTime.UtcNow,
            Version = 1,
            IsActive = true
        };

        await _repository.AddAsync(entity);

        var found = await _repository.GetByUserKinkIdAsync(_userId);

        found.Should().NotBeNull();
        found!.UserKinkId.Should().Be(_userId);
        found.AnswersJson.Should().Contain("item_rope");
        found.Version.Should().Be(1);
    }

    [TestCase(0L)]
    [TestCase(-5L)]
    [TestCase(99999L)]
    public async Task GetByUserKinkIdAsync_WhenMissingOrNonPositive_ShouldReturnNull(long candidateUserId)
    {
        // Cenário: Busca por usuário sem checklist cadastrado ou com identificador inválido (<= 0).
        // Objetivo: Garantir retorno nulo seguro sem lançar exceções.
        var found = await _repository.GetByUserKinkIdAsync(candidateUserId);

        found.Should().BeNull();
    }

    [Test]
    public async Task DeleteByUserKinkIdAsync_WhenExists_ShouldRemoveAndAllowReinsertion()
    {
        // Cenário: Exclusão de checklist existente seguida de reinserção para o mesmo usuário.
        // Objetivo: Validar remoção física e retorno false quando o registro não existe mais.
        var entity = new UserKinkCheclist
        {
            UserKinkId = _userId,
            SchemaVersion = "1.0.0",
            Language = "en-US",
            AnswersJson = "{\"item_cuffs\":{\"primaryScale\":\"favorite\"}}",
            ClientUpdatedAtUtc = DateTime.UtcNow,
            Version = 2,
            IsActive = true
        };

        await _repository.AddAsync(entity);

        var deletedFirst = await _repository.DeleteByUserKinkIdAsync(_userId);
        var afterDelete = await _repository.GetByUserKinkIdAsync(_userId);
        var deletedSecond = await _repository.DeleteByUserKinkIdAsync(_userId);

        deletedFirst.Should().BeTrue();
        afterDelete.Should().BeNull();
        deletedSecond.Should().BeFalse();

        var reinserted = new UserKinkCheclist
        {
            UserKinkId = _userId,
            SchemaVersion = "1.0.0",
            Language = "pt-BR",
            AnswersJson = "{\"item_rope\":{\"primaryScale\":\"curious\"}}",
            ClientUpdatedAtUtc = DateTime.UtcNow,
            Version = 1,
            IsActive = true
        };

        var created = await _repository.AddAsync(reinserted);
        created.Id.Should().BeGreaterThan(0);
        created.Version.Should().Be(1);
    }
}
