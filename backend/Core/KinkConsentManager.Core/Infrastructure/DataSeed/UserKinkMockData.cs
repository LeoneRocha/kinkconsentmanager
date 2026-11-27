using KinkConsentManager.Core.Domain.Entities;

namespace KinkConsentManager.Core.Infrastructure.DataSeed;

/// <summary>
/// Fornece usuários de exemplo e credenciais determinísticas para ambientes que aplicam o seed.
/// O código contém somente hashes criptográficos previamente calculados; não recupera nem expõe e-mails ou senhas em texto puro (LGPD).
/// </summary>
public static class UserKinkMockData
{
    /// <summary>Instante UTC fixo usado nos campos de auditoria do seed.</summary>
    public static readonly DateTime SeedTimestamp = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    /// <summary>Hash SHA-256 fixo do e-mail de administrador.</summary>
    public const string SeedAdminEmailHash = "FFDD3421B537E0C70CB8D8931772925F40CD76561DDC566B6CDD017E420A2810";

    /// <summary>Hash SHA-256 fixo do e-mail do usuário de exemplo.</summary>
    public const string SeedUserKinkEmailHash = "5BA24FBC3AC450EC1740200753BC7C607D869AB010935DFBB1121D3315553A15";

#pragma warning disable S2068
    // SonarQube: disable S8215
    /// <summary>Hash BCrypt fixo da credencial de administrador (admin / admin1234).</summary>
    public const string SeedAdminPasswordHash = "$2a$11$Avil9NTw2WW2CiU1ey5q8OSOaidQnX7lKEhhPqyq4gkAkXHEpOorC"; // NOSONAR

    /// <summary>Hash BCrypt fixo do usuário de exemplo (user.kink / user.kink2026).</summary>
    public const string SeedUserKinkPasswordHash = "$2a$11$DfVa0L0kLOnn3fD31R1BcOV5ByNv3OOG/cyO7mXP4DXJSA7q3nCZO"; // NOSONAR
    // SonarQube: enable S8215
#pragma warning restore S2068

    /// <summary>Identificadores determinísticos de referência dos usuários de seed.</summary>
    public static class UserIds
    {
        /// <summary>ID do usuário administrador.</summary>
        public const long Admin = 1L;

        /// <summary>ID do usuário de exemplo UserKink.</summary>
        public const long DemoUserKink = 2L;
    }

    /// <summary>
    /// Cria a coleção de usuários de exemplo determinísticos para a plataforma KinkConsentManager.
    /// </summary>
    /// <returns>Nova coleção pronta para o seed do EF Core.</returns>
    public static IEnumerable<UserKink> GetMock()
    {
        return new List<UserKink>
        {
            // 1. Administrador da Plataforma
            new UserKink
            {
                Id = UserIds.Admin,
                Login = "admin",
                NormalizedLogin = "admin",
                EmailHash = SeedAdminEmailHash,
                PasswordHash = SeedAdminPasswordHash,
                LastLoginAt = null,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp,
                IsActive = true
            },

            // 2. Usuário de exemplo para UserKink
            new UserKink
            {
                Id = UserIds.DemoUserKink,
                Login = "user.kink",
                NormalizedLogin = "user.kink",
                EmailHash = SeedUserKinkEmailHash,
                PasswordHash = SeedUserKinkPasswordHash,
                LastLoginAt = null,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp,
                IsActive = true
            }
        };
    }
}
