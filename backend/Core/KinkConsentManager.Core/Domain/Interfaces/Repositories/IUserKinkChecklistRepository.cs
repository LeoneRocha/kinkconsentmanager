using KinkConsentManager.Core.Domain.Entities;
using SmartCoreHub.Core.SDK.Infrastructure.Repositories.Generic;

namespace KinkConsentManager.Core.Domain.Interfaces.Repositories;

/// <summary>
/// Contrato de repositório para persistência 1:1 do checklist on-line (<see cref="UserKinkCheclist"/>).
/// </summary>
public interface IUserKinkChecklistRepository : IGenericRepository<UserKinkCheclist>
{
    /// <summary>
    /// Obtém o checklist persistido pertencente ao usuário informado.
    /// </summary>
    /// <param name="userKinkId">Identificador do usuário proprietário.</param>
    /// <param name="cancellationToken">Token para cancelamento assíncrono.</param>
    /// <returns>Entidade encontrada ou <c>null</c> quando não houver registro.</returns>
    Task<UserKinkCheclist?> GetByUserKinkIdAsync(long userKinkId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove o checklist persistido pertencente ao usuário informado, caso exista.
    /// </summary>
    /// <param name="userKinkId">Identificador do usuário proprietário.</param>
    /// <param name="cancellationToken">Token para cancelamento assíncrono.</param>
    /// <returns><c>true</c> quando o registro existia e foi removido; caso contrário, <c>false</c>.</returns>
    Task<bool> DeleteByUserKinkIdAsync(long userKinkId, CancellationToken cancellationToken = default);
}
