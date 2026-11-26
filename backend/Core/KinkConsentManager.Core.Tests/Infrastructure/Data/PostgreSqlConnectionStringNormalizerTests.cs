using KinkConsentManager.Core.Infrastructure.Data;
using Npgsql;
using NUnit.Framework;

namespace KinkConsentManager.Core.Tests.Infrastructure.Data;

[TestFixture]
public sealed class PostgreSqlConnectionStringNormalizerTests
{
    [TestCase(null)]
    [TestCase("")]
    [TestCase("   ")]
    public void Normalize_WhenNullOrWhitespace_ShouldReturnOriginalValue(string? input)
    {
        // Cenário: Connection string nula ou vazia.
        // Objetivo: Garantir retorno preservado sem exceções.
        var result = PostgreSqlConnectionStringNormalizer.Normalize(input);

        Assert.That(result, Is.EqualTo(input));
    }

    [Test]
    public void Normalize_WhenKeyValueFormat_ShouldReturnOriginalUnchanged()
    {
        // Cenário: Connection string já informada no formato ADO.NET chave-valor.
        // Objetivo: Garantir preservação integral sem reescrita.
        const string input = "Host=localhost;Port=5432;Database=kinkconsentmanager;Username=postgres;Password=secret;";

        var result = PostgreSqlConnectionStringNormalizer.Normalize(input);

        Assert.That(result, Is.EqualTo(input));
    }

    [Test]
    public void Normalize_WhenRemotePostgresqlUri_ShouldConvertWithSslRequire()
    {
        // Cenário: URI postgresql:// remota (padrão Supabase) com senha codificada em URL.
        // Objetivo: Garantir conversão para NpgsqlConnectionStringBuilder com SSL Mode Require.
        const string input = "postgresql://postgres.proj:p%40ss%3Aword@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

        var result = PostgreSqlConnectionStringNormalizer.Normalize(input);
        var builder = new NpgsqlConnectionStringBuilder(result);

        Assert.That(builder.Host, Is.EqualTo("aws-0-sa-east-1.pooler.supabase.com"));
        Assert.That(builder.Port, Is.EqualTo(6543));
        Assert.That(builder.Database, Is.EqualTo("postgres"));
        Assert.That(builder.Username, Is.EqualTo("postgres.proj"));
        Assert.That(builder.Password, Is.EqualTo("p@ss:word"));
        Assert.That(builder.SslMode, Is.EqualTo(SslMode.Require));
    }

    [Test]
    public void Normalize_WhenLocalPostgresUriWithoutPortOrDb_ShouldUseDefaultsWithoutForcingSslRequire()
    {
        // Cenário: URI postgres:// para localhost sem porta nem banco explícitos.
        // Objetivo: Garantir fallback para porta 5432 e database postgres sem forçar SslMode.Require.
        const string input = "postgres://devuser:devpass@localhost";

        var result = PostgreSqlConnectionStringNormalizer.Normalize(input);
        var builder = new NpgsqlConnectionStringBuilder(result);

        Assert.That(builder.Host, Is.EqualTo("localhost"));
        Assert.That(builder.Port, Is.EqualTo(5432));
        Assert.That(builder.Database, Is.EqualTo("postgres"));
        Assert.That(builder.Username, Is.EqualTo("devuser"));
        Assert.That(builder.Password, Is.EqualTo("devpass"));
        Assert.That(builder.SslMode, Is.Not.EqualTo(SslMode.Require));
    }

    [Test]
    public void Normalize_WhenQueryParametersProvided_ShouldApplySslModePoolingAndTimeout()
    {
        // Cenário: URI postgresql:// com parâmetros de query sslmode, pooling e timeout.
        // Objetivo: Garantir aplicação explícita dos parâmetros suportados.
        const string input = "postgresql://user:pass@db.example.com:5432/appdb?sslmode=VerifyFull&pooling=false&timeout=30";

        var result = PostgreSqlConnectionStringNormalizer.Normalize(input);
        var builder = new NpgsqlConnectionStringBuilder(result);

        Assert.That(builder.Database, Is.EqualTo("appdb"));
        Assert.That(builder.SslMode, Is.EqualTo(SslMode.VerifyFull));
        Assert.That(builder.Pooling, Is.False);
        Assert.That(builder.Timeout, Is.EqualTo(30));
    }
}
