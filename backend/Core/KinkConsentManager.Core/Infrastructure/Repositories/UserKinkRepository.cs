using KinkConsentManager.Core.Domain.Entities;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Common;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;
using SmartCoreHub.Core.SDK.EntityFrameworkCore.Repositories;

namespace KinkConsentManager.Core.Infrastructure.Repositories;

/// <summary>
/// Repositório de usuários suportando autenticação dual (Login ou Email) case-insensitive no PostgreSQL.
/// </summary>
public sealed class UserKinkRepository
    : GenericRepository<UserKink, KinkConsentManagerDbContext>, IUserKinkRepository
{
    /// <summary>
    /// Inicializa uma nova instância de <see cref="UserKinkRepository"/>.
    /// </summary>
    /// <param name="dbScope">Escopo EF Core do contexto <see cref="KinkConsentManagerDbContext"/>.</param>
    /// <param name="logger">Logger transversal da aplicação.</param>
    public UserKinkRepository(IKinkConsentManagerDbScope dbScope, IAppLogger logger)
        : base(dbScope, logger)
    {
    }

    /// <inheritdoc />
    public Task<UserKink?> GetByLoginAsync(string login, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(login))
        {
            return Task.FromResult<UserKink?>(null);
        }

        var normalized = login.Trim().ToLowerInvariant();
        return _dbSet.FirstOrDefaultAsync(u => u.NormalizedLogin == normalized, cancellationToken);
    }

    /// <inheritdoc />
    public Task<UserKink?> GetByEmailAsync(Email email, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(email);
        return _dbSet.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<UserKink?> GetByLoginOrEmailAsync(string loginOrEmail, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(loginOrEmail))
        {
            return null;
        }

        var trimmed = loginOrEmail.Trim();

        // Como Login nunca aceita '@', a presença de '@' identifica e-mail deterministicamente.
        if (trimmed.Contains('@'))
        {
            if (!TryCreateEmail(trimmed, out var email))
            {
                // Evita exceção 500 caso o usuário informe um e-mail malformado contendo '@'.
                return null;
            }

            return await GetByEmailAsync(email!, cancellationToken);
        }

        return await GetByLoginAsync(trimmed, cancellationToken);
    }

    /// <inheritdoc />
    public Task<bool> LoginExistsAsync(string login, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(login))
        {
            return Task.FromResult(false);
        }

        var normalized = login.Trim().ToLowerInvariant();
        return _dbSet.AnyAsync(u => u.NormalizedLogin == normalized, cancellationToken);
    }

    /// <inheritdoc />
    public Task<bool> EmailExistsAsync(Email email, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(email);
        return _dbSet.AnyAsync(u => u.Email == email, cancellationToken);
    }

    private static bool TryCreateEmail(string candidate, out Email? email)
    {
        try
        {
            email = new Email(candidate);
            return true;
        }
        catch (ArgumentException)
        {
            email = null;
            return false;
        }
    }
}
