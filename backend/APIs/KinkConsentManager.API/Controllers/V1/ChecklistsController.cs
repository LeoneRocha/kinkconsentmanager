using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Service.Cqrs.Checklists.Commands;
using KinkConsentManager.Core.Service.Cqrs.Checklists.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartCoreHub.Core.SDK.Application.Cqrs.Abstractions;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;
using SmartCoreHub.Core.SDK.Domain.Security;
using SmartCoreHub.Core.SDK.Service.API.Generic;

namespace KinkConsentManager.API.Controllers.V1;

/// <summary>
/// Controlador v1 responsável pela leitura, salvamento on-line (upsert) e exclusão
/// do checklist único do usuário autenticado na tabela <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
[Authorize]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public sealed class ChecklistsController : BaseApiController
{
    private readonly IApplicationDispatcher _dispatcher;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="ChecklistsController"/>.
    /// </summary>
    /// <param name="dispatcher">Despachante CQRS utilizado para enviar commands e queries.</param>
    /// <exception cref="ArgumentNullException">Lançada quando <paramref name="dispatcher"/> for nulo.</exception>
    public ChecklistsController(IApplicationDispatcher dispatcher)
    {
        _dispatcher = dispatcher ?? throw new ArgumentNullException(nameof(dispatcher));
    }

    /// <summary>
    /// Recupera o checklist salvo on-line pertencente ao usuário autenticado.
    /// </summary>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com os dados persistidos do checklist ou 404 caso ainda não exista.</returns>
    /// <response code="200">Checklist recuperado com sucesso.</response>
    /// <response code="401">Token de autenticação ausente ou inválido.</response>
    /// <response code="404">Nenhum checklist salvo on-line foi encontrado para este usuário.</response>
    [HttpGet("current")]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken = default)
    {
        var userKinkId = UserClaimsHelper.TryGetUserId(User).GetValueOrDefault();

        var response = await _dispatcher.QueryAsync(
            new GetCurrentUserKinkChecklistQuery(userKinkId),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Cria ou atualiza (upsert idempotente) o checklist único do usuário autenticado.
    /// </summary>
    /// <param name="request">Payload com schemaVersion, idioma, respostas JSON e versão otimista opcional.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope com o estado atualizado do checklist persistido.</returns>
    /// <response code="200">Checklist salvo on-line com sucesso.</response>
    /// <response code="400">Payload inválido ou acima do limite permitido.</response>
    /// <response code="401">Token de autenticação ausente ou inválido.</response>
    /// <response code="409">Conflito de versão otimista detectado.</response>
    [HttpPut("current")]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ServiceResponse<UserKinkChecklistDto>), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpsertCurrent(
        [FromBody] UpsertUserKinkChecklistRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var userKinkId = UserClaimsHelper.TryGetUserId(User).GetValueOrDefault();

        var response = await _dispatcher.SendAsync(
            new UpsertUserKinkChecklistCommand(userKinkId, request),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }

    /// <summary>
    /// Exclui de forma idempotente o checklist salvo on-line do usuário autenticado.
    /// </summary>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Envelope indicando sucesso na remoção.</returns>
    /// <response code="200">Preenchimento salvo removido com sucesso.</response>
    /// <response code="401">Token de autenticação ausente ou inválido.</response>
    [HttpDelete("current")]
    [ProducesResponseType(typeof(ServiceResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ServiceResponse<bool>), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteCurrent(CancellationToken cancellationToken = default)
    {
        var userKinkId = UserClaimsHelper.TryGetUserId(User).GetValueOrDefault();

        var response = await _dispatcher.SendAsync(
            new DeleteCurrentUserKinkChecklistCommand(userKinkId),
            cancellationToken);

        return StatusCode(response.StatusCode, response);
    }
}
