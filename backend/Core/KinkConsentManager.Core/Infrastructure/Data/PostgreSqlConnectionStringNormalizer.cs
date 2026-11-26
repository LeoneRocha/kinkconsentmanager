using Npgsql;

namespace KinkConsentManager.Core.Infrastructure.Data;

/// <summary>
/// Normaliza strings de conexão PostgreSQL em formato URI (<c>postgres://</c> ou <c>postgresql://</c>),
/// como as fornecidas pelo Supabase, para o formato chave-valor esperado pelo driver Npgsql.
/// </summary>
public static class PostgreSqlConnectionStringNormalizer
{
    private const int DefaultPostgreSqlPort = 5432;
    private const string DefaultDatabase = "postgres";

    /// <summary>
    /// Converte uma URI PostgreSQL para connection string ADO.NET/Npgsql, preservando strings já em formato chave-valor.
    /// </summary>
    /// <param name="connectionString">String de conexão configurada (URI ou chave-valor).</param>
    /// <returns>Connection string compatível com <see cref="NpgsqlConnectionStringBuilder"/>.</returns>
    public static string? Normalize(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        var trimmed = connectionString.Trim();
        if (!trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
            !trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            return connectionString;
        }

        var uri = new Uri(trimmed);
        var database = uri.AbsolutePath.TrimStart('/');
        if (string.IsNullOrWhiteSpace(database))
        {
            database = DefaultDatabase;
        }
        else
        {
            database = Uri.UnescapeDataString(database);
        }

        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : DefaultPostgreSqlPort,
            Database = database
        };

        ApplyCredentials(builder, uri.UserInfo);

        if (!IsLoopbackHost(uri.Host))
        {
            builder.SslMode = SslMode.Require;
        }

        ApplyQueryParameters(builder, uri.Query);

        return builder.ConnectionString;
    }

    private static void ApplyCredentials(NpgsqlConnectionStringBuilder builder, string userInfo)
    {
        if (string.IsNullOrEmpty(userInfo))
        {
            return;
        }

        var separatorIndex = userInfo.IndexOf(':');
        if (separatorIndex < 0)
        {
            builder.Username = Uri.UnescapeDataString(userInfo);
            return;
        }

        var username = Uri.UnescapeDataString(userInfo[..separatorIndex]);
        var password = Uri.UnescapeDataString(userInfo[(separatorIndex + 1)..]);

        if (!string.IsNullOrEmpty(username))
        {
            builder.Username = username;
        }

        if (!string.IsNullOrEmpty(password))
        {
            builder.Password = password;
        }
    }

    private static bool IsLoopbackHost(string host)
    {
        return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(host, "[::1]", StringComparison.OrdinalIgnoreCase);
    }

    private static void ApplyQueryParameters(NpgsqlConnectionStringBuilder builder, string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return;
        }

        var pairs = query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries);
        foreach (var pair in pairs)
        {
            var eqIndex = pair.IndexOf('=');
            if (eqIndex <= 0)
            {
                continue;
            }

            var key = Uri.UnescapeDataString(pair[..eqIndex]).Trim();
            var value = Uri.UnescapeDataString(pair[(eqIndex + 1)..]).Trim();

            if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase) &&
                Enum.TryParse<SslMode>(value, ignoreCase: true, out var sslMode))
            {
                builder.SslMode = sslMode;
            }
            else if (key.Equals("pooling", StringComparison.OrdinalIgnoreCase) &&
                     bool.TryParse(value, out var pooling))
            {
                builder.Pooling = pooling;
            }
            else if (key.Equals("timeout", StringComparison.OrdinalIgnoreCase) &&
                     int.TryParse(value, out var timeout))
            {
                builder.Timeout = timeout;
            }
        }
    }
}
