using KinkConsentManager.Core.Domain.DTOs.Checklists;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Domain.Interfaces.Services;

/// <summary>
/// Contrato de aplicação para leitura, upsert com concorrência otimista e exclusão do checklist único do usuário.
/// </summary>
public interface IUserKinkChecklistService
{
    /// <summary>
    /// Obtém o checklist salvo on-line para o usuário autenticado.
    /// </summary>
    /// <param name="userKinkId">Identificador do usuário extraído do token JWT.</param>
    /// <param name="cancellationToken">Token para cancelamento assíncrono.</param>
    /// <returns>Envelope <see cref="ServiceResponse{T}"/> com <see cref="UserKinkChecklistDto"/> ou 404.</returns>
    Task<ServiceResponse<UserKinkChecklistDto>> GetCurrentAsync(long userKinkId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cria ou atualiza o checklist único do usuário autenticado, aplicando validação de contrato e concorrência otimista.
    /// </summary>
    /// <param name="userKinkId">Identificador do usuário extraído do token JWT.</param>
    /// <param name="request">Payload de criação ou atualização do checklist.</param>
    /// <param name="cancellationToken">Token para cancelamento assíncrono.</param>
    /// <returns>Envelope <see cref="ServiceResponse{T}"/> com o DTO persistido, erro de validação (400) ou conflito (409).</returns>
    Task<ServiceResponse<UserKinkChecklistDto>> UpsertCurrentAsync(
        long userKinkId,
        UpsertUserKinkChecklistRequestDto request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Exclui de forma idempotente o checklist salvo on-line para o usuário autenticado.
    /// </summary>
    /// <param name="userKinkId">Identificador do usuário extraído do token JWT.</param>
    /// <param name="cancellationToken">Token para cancelamento assíncrono.</param>
    /// <returns>Envelope <see cref="ServiceResponse{T}"/> com <c>true</c>.</returns>
    Task<ServiceResponse<bool>> DeleteCurrentAsync(long userKinkId, CancellationToken cancellationToken = default);
}
