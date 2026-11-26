using KinkConsentManager.Core.Domain.Entities;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Infrastructure.DataSeed;

/// <summary>
/// Fornece usuários de exemplo e credenciais determinísticas para ambientes que aplicam o seed.
/// O código contém somente o hash BCrypt previamente calculado; não recupera nem expõe senhas em texto puro.
/// </summary>
public static class UserKinkMockData
{
    /// <summary>Instante UTC fixo usado nos campos de auditoria do seed.</summary>
    public static readonly DateTime SeedTimestamp = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);

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
            // 1. Administrador da Plataforma (admin / admin1234)
            new UserKink
            {
                Id = UserIds.Admin,
                Name = "Admin Kink",
                Login = "admin",
                NormalizedLogin = "admin",
                Email = new Email("admin@kinkconsentmanager.local"),
                PasswordHash = SeedAdminPasswordHash,
                LastLoginAt = null,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp,
                IsActive = true
            },

            // 2. Usuário de exemplo para UserKink (user.kink / user.kink2026)
            new UserKink
            {
                Id = UserIds.DemoUserKink,
                Name = "Demo User Kink",
                Login = "user.kink",
                NormalizedLogin = "user.kink",
                Email = new Email("user.kink@kinkconsentmanager.local"),
                PasswordHash = SeedUserKinkPasswordHash,
                LastLoginAt = null,
                CreatedAt = SeedTimestamp,
                UpdatedAt = SeedTimestamp,
                IsActive = true
            }
        };
    }
}
