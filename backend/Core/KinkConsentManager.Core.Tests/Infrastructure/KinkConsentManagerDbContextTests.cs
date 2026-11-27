using System.Collections;
using System.Globalization;
using System.Reflection;
using System.Resources;
using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;

namespace KinkConsentManager.Core.Tests.Infrastructure;

[TestFixture]
public sealed class KinkConsentManagerDbContextTests
{
    private KinkConsentManagerDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<KinkConsentManagerDbContext>()
            .UseInMemoryDatabase($"DbContextModelTests_{Guid.NewGuid():N}")
            .Options;

        return new KinkConsentManagerDbContext(options);
    }

    [Test]
    public void Model_ShouldConfigureDefaultSchemaAsKinkConsent()
    {
        // Cenário: Construção do modelo EF Core do KinkConsentManagerDbContext em InMemory.
        // Objetivo: Validar que o schema padrão do modelo seja exatamente "kink_consent".
        using var context = CreateInMemoryContext();

        KinkConsentManagerDbContext.DefaultSchema.Should().Be("kink_consent");
        context.Model.GetDefaultSchema().Should().Be("kink_consent");
    }

    [TestCase(typeof(UserKink), "UserKinks")]
    [TestCase(typeof(UserKinkRefreshToken), "UserKinkRefreshTokens")]
    [TestCase(typeof(UserKinkCheclist), "UserKinkCheclists")]
    public void Model_ShouldMapAllEntitiesToKinkConsentSchema(Type entityClrType, string expectedTableName)
    {
        // Cenário: Inspeção dos metadados de tabela e schema para cada entidade do domínio.
        // Objetivo: Garantir que UserKink, UserKinkRefreshToken e UserKinkCheclist estejam no schema "kink_consent".
        using var context = CreateInMemoryContext();

        var entityType = context.Model.FindEntityType(entityClrType);

        entityType.Should().NotBeNull();
        entityType!.GetSchema().Should().Be("kink_consent");
        entityType.GetTableName().Should().Be(expectedTableName);
    }

    [Test]
    public void Model_ShouldConfigureAllRequiredUniqueIndexes()
    {
        // Cenário: Inspeção dos índices configurados nas entidades UserKink, UserKinkRefreshToken e UserKinkCheclist.
        // Objetivo: Garantir unicidade para EmailHash (LGPD), NormalizedLogin, Login, TokenHash e UserKinkId (1:1).
        using var context = CreateInMemoryContext();

        var userKinkEntity = context.Model.FindEntityType(typeof(UserKink))!;
        var refreshTokenEntity = context.Model.FindEntityType(typeof(UserKinkRefreshToken))!;
        var checklistEntity = context.Model.FindEntityType(typeof(UserKinkCheclist))!;

        userKinkEntity.FindProperty("Email").Should().BeNull();
        userKinkEntity.FindProperty("Name").Should().BeNull();
        HasUniqueIndexOn(userKinkEntity, nameof(UserKink.EmailHash)).Should().BeTrue();
        HasUniqueIndexOn(userKinkEntity, nameof(UserKink.NormalizedLogin)).Should().BeTrue();
        HasUniqueIndexOn(userKinkEntity, nameof(UserKink.Login)).Should().BeTrue();
        HasUniqueIndexOn(refreshTokenEntity, nameof(UserKinkRefreshToken.TokenHash)).Should().BeTrue();
        HasUniqueIndexOn(checklistEntity, nameof(UserKinkCheclist.UserKinkId)).Should().BeTrue();
    }

    [Test]
    public void Model_ShouldConfigureGinIndexOnUserKinkCheclistAnswersJson()
    {
        // Cenário: Inspeção do índice da propriedade AnswersJson em UserKinkCheclist.
        // Objetivo: Validar anotação PostgreSQL Npgsql:IndexMethod == "gin" para buscas jsonb.
        using var context = CreateInMemoryContext();

        var checklistEntity = context.Model.FindEntityType(typeof(UserKinkCheclist))!;
        var answersIndex = checklistEntity.GetIndexes()
            .SingleOrDefault(i => i.Properties.Any(p => p.Name == nameof(UserKinkCheclist.AnswersJson)));

        answersIndex.Should().NotBeNull();
        answersIndex!.GetDatabaseName().Should().Be("IX_UserKinkCheclists_AnswersJson_Gin");
        answersIndex.FindAnnotation("Npgsql:IndexMethod")?.Value.Should().Be("gin");
    }

    [Test]
    public void LocalizationResources_ValidationMessages_ShouldHaveFullParityWithValidationMessageKeys()
    {
        // Cenário: Comparação entre ValidationMessageKeys (chaves do produto sem prefixo do SDK) e os recursos ValidationMessages.resx / ValidationMessages.pt-BR.resx.
        // Objetivo: Garantir paridade de 100% entre os dois arquivos .resx e cobertura total das chaves de produto.
        var manager = new ResourceManager(
            "KinkConsentManager.Core.Infrastructure.Localization.Resources.ValidationMessages",
            typeof(KinkConsentManagerDbContext).Assembly);

        var enKeys = ReadResourceDictionary(manager, CultureInfo.InvariantCulture, tryParents: false);
        var ptKeys = ReadResourceDictionary(manager, CultureInfo.GetCultureInfo("pt-BR"), tryParents: false);

        var expectedProductKeys = GetPublicConstantValues(typeof(ValidationMessageKeys))
            .Where(k => !k.StartsWith("SmartCoreHub.Core.SDK.", StringComparison.Ordinal))
            .ToArray();

        enKeys.Keys.Should().BeEquivalentTo(ptKeys.Keys);
        enKeys.Keys.Should().BeEquivalentTo(expectedProductKeys);
        ptKeys.Keys.Should().BeEquivalentTo(expectedProductKeys);
        enKeys.Values.Should().OnlyContain(v => !string.IsNullOrWhiteSpace(v));
        ptKeys.Values.Should().OnlyContain(v => !string.IsNullOrWhiteSpace(v));
    }

    [Test]
    public void LocalizationResources_AuthMessages_ShouldHaveFullParityWithAuthenticationMessageKeys()
    {
        // Cenário: Comparação entre AuthenticationMessageKeys e os recursos AuthMessages.resx / AuthMessages.pt-BR.resx.
        // Objetivo: Garantir paridade de 100% entre os dois arquivos .resx e cobertura total de todas as chaves de autenticação.
        var manager = new ResourceManager(
            "KinkConsentManager.Core.Infrastructure.Localization.Resources.AuthMessages",
            typeof(KinkConsentManagerDbContext).Assembly);

        var enKeys = ReadResourceDictionary(manager, CultureInfo.InvariantCulture, tryParents: false);
        var ptKeys = ReadResourceDictionary(manager, CultureInfo.GetCultureInfo("pt-BR"), tryParents: false);

        var expectedAuthKeys = GetPublicConstantValues(typeof(AuthenticationMessageKeys));

        enKeys.Keys.Should().BeEquivalentTo(ptKeys.Keys);
        enKeys.Keys.Should().BeEquivalentTo(expectedAuthKeys);
        ptKeys.Keys.Should().BeEquivalentTo(expectedAuthKeys);
        enKeys.Values.Should().OnlyContain(v => !string.IsNullOrWhiteSpace(v));
        ptKeys.Values.Should().OnlyContain(v => !string.IsNullOrWhiteSpace(v));
    }

    private static bool HasUniqueIndexOn(Microsoft.EntityFrameworkCore.Metadata.IEntityType entityType, string propertyName)
    {
        return entityType.GetIndexes()
            .Any(i => i.IsUnique && i.Properties.Count == 1 && i.Properties[0].Name == propertyName);
    }

    private static string[] GetPublicConstantValues(Type type)
    {
        return type.GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
            .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .ToArray();
    }

    private static Dictionary<string, string> ReadResourceDictionary(
        ResourceManager manager,
        CultureInfo culture,
        bool tryParents)
    {
        using var resourceSet = manager.GetResourceSet(culture, createIfNotExists: true, tryParents: tryParents);
        resourceSet.Should().NotBeNull($"resource set for culture '{culture.Name}' should exist");

        var entries = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (DictionaryEntry entry in resourceSet!)
        {
            entries[(string)entry.Key] = entry.Value?.ToString() ?? string.Empty;
        }

        return entries;
    }
}
