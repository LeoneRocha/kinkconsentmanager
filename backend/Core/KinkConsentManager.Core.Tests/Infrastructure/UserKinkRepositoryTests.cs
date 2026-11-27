using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Security;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Tests.Infrastructure;

[TestFixture]
public sealed class UserKinkRepositoryTests
{
    private KinkConsentManagerDbContext _dbContext = null!;
    private KinkConsentManagerDbContextScope _dbScope = null!;
    private UserKinkRepository _repository = null!;

    [SetUp]
    public async Task SetUp()
    {
        var options = new DbContextOptionsBuilder<KinkConsentManagerDbContext>()
            .UseInMemoryDatabase($"UserKinkRepoTests_{Guid.NewGuid():N}")
            .Options;

        _dbContext = new KinkConsentManagerDbContext(options);
        _dbScope = new KinkConsentManagerDbContextScope(_dbContext, options: options);
        _repository = new UserKinkRepository(_dbScope, NullAppLogger.Instance);

        var user = new UserKink
        {
            PasswordHash = "$2a$11$hashedpasswordvalue",
            IsActive = true
        };
        user.SetLogin("Alex_Silva");
        user.SetEmail("Alex.Silva@Example.com");

        _dbContext.UserKinks.Add(user);
        await _dbContext.SaveChangesAsync();
    }

    [TearDown]
    public void TearDown()
    {
        _dbContext.Dispose();
    }

    [TestCase("alex_silva")]
    [TestCase("ALEX_SILVA")]
    [TestCase("  Alex_Silva  ")]
    public async Task GetByLoginAsync_WhenLoginVariesInCaseOrWhitespace_ShouldReturnUser(string candidateLogin)
    {
        // Cenário: Consulta por login com variações de maiúsculas/minúsculas e espaços nas pontas.
        // Objetivo: Garantir que GetByLoginAsync encontre o usuário cadastrado via NormalizedLogin.
        var found = await _repository.GetByLoginAsync(candidateLogin);

        found.Should().NotBeNull();
        found!.Login.Should().Be("Alex_Silva");
        found.NormalizedLogin.Should().Be("alex_silva");
    }

    [Test]
    public async Task GetByLoginAsync_WhenLoginIsWhitespace_ShouldReturnNull()
    {
        // Cenário: Consulta com string de login vazia ou apenas espaços.
        // Objetivo: Garantir retorno nulo sem consultar ou lançar exceção.
        var found = await _repository.GetByLoginAsync("   ");

        found.Should().BeNull();
    }

    [TestCase("alex.silva@example.com")]
    [TestCase("ALEX.SILVA@EXAMPLE.COM")]
    public async Task GetByEmailAsync_WhenEmailVariesInCase_ShouldReturnUser(string candidateEmail)
    {
        // Cenário: Consulta por Value Object Email construído com diferentes capitalizações.
        // Objetivo: Garantir busca case-insensitive sobre EmailHash sem armazenar e-mail em texto plano.
        var found = await _repository.GetByEmailAsync(new Email(candidateEmail));

        found.Should().NotBeNull();
        found!.EmailHash.Should().Be(EmailHashHelper.ComputeHash("alex.silva@example.com"));
    }

    [TestCase("Alex_Silva")]
    [TestCase("alex_silva")]
    [TestCase("ALEX_SILVA")]
    [TestCase("Alex.Silva@Example.com")]
    [TestCase("ALEX.SILVA@EXAMPLE.COM")]
    public async Task GetByLoginOrEmailAsync_WhenValidLoginOrEmailWithDifferentCasing_ShouldReturnUser(string loginOrEmail)
    {
        // Cenário: Autenticação dual informando ora login ora e-mail com variações de caixa.
        // Objetivo: Validar que GetByLoginOrEmailAsync resolva corretamente ambos os identificadores via hash LGPD.
        var found = await _repository.GetByLoginOrEmailAsync(loginOrEmail);

        found.Should().NotBeNull();
        found!.Login.Should().Be("Alex_Silva");
        found.EmailHash.Should().Be(EmailHashHelper.ComputeHash("alex.silva@example.com"));
    }

    [TestCase("foo@invalido")]
    [TestCase("@invalido")]
    [TestCase("foo@")]
    public async Task GetByLoginOrEmailAsync_WhenStringContainsAtButIsMalformedEmail_ShouldReturnNullWithoutThrowing(string malformedEmail)
    {
        // Cenário: Entrada contendo '@' que falha na validação do Value Object Email (ex.: "foo@invalido").
        // Objetivo: Garantir que o repositório capture a falha de formato e retorne null sem lançar exceção 500.
        var found = await _repository.GetByLoginOrEmailAsync(malformedEmail);

        found.Should().BeNull();
    }

    [Test]
    public async Task LoginExistsAsync_ShouldReturnExpectedBooleanCaseInsensitively()
    {
        // Cenário: Verificação de existência para login existente em outra capitalização e para login inexistente.
        // Objetivo: Garantir que LoginExistsAsync retorne true para "alex_silva" e false para "outro_user".
        var existsUpper = await _repository.LoginExistsAsync("ALEX_SILVA");
        var existsLower = await _repository.LoginExistsAsync("alex_silva");
        var notExists = await _repository.LoginExistsAsync("outro_user");
        var blank = await _repository.LoginExistsAsync(" ");

        existsUpper.Should().BeTrue();
        existsLower.Should().BeTrue();
        notExists.Should().BeFalse();
        blank.Should().BeFalse();
    }

    [Test]
    public async Task EmailExistsAsync_ShouldReturnExpectedBooleanCaseInsensitively()
    {
        // Cenário: Verificação de existência para e-mail existente em maiúsculas e para e-mail inexistente.
        // Objetivo: Garantir que EmailExistsAsync retorne true para e-mail cadastrado e false para não cadastrado.
        var exists = await _repository.EmailExistsAsync(new Email("ALEX.SILVA@EXAMPLE.COM"));
        var notExists = await _repository.EmailExistsAsync(new Email("novo@example.com"));

        exists.Should().BeTrue();
        notExists.Should().BeFalse();
    }
}
