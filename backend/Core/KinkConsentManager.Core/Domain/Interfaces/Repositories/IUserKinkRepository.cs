using KinkConsentManager.Core.Domain.Entities;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;
using SmartCoreHub.Core.SDK.Infrastructure.Repositories.Generic;

namespace KinkConsentManager.Core.Domain.Interfaces.Repositories;

/// <summary>
/// Contrato de repositório para persistência e consultas case-insensitive de <see cref="UserKink"/>.
/// </summary>
public interface IUserKinkRepository : IGenericRepository<UserKink>
{
    /// <summary>Busca usuário pelo login normalizado (case-insensitive).</summary>
    Task<UserKink?> GetByLoginAsync(string login, CancellationToken cancellationToken = default);

    /// <summary>Busca usuário pelo Value Object de e-mail normalizado.</summary>
    Task<UserKink?> GetByEmailAsync(Email email, CancellationToken cancellationToken = default);

    /// <summary>Busca usuário pelo login ou e-mail informado, tratando com segurança valores malformados.</summary>
    Task<UserKink?> GetByLoginOrEmailAsync(string loginOrEmail, CancellationToken cancellationToken = default);

    /// <summary>Verifica se já existe usuário com o login informado (case-insensitive).</summary>
    Task<bool> LoginExistsAsync(string login, CancellationToken cancellationToken = default);

    /// <summary>Verifica se já existe usuário com o e-mail informado.</summary>
    Task<bool> EmailExistsAsync(Email email, CancellationToken cancellationToken = default);
}
