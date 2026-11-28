namespace KinkConsentManager.Core.Domain.DTOs.Checklists;

/// <summary>
/// Dados de entrada para criação ou atualização (upsert) do checklist único do usuário autenticado.
/// </summary>
/// <param name="SchemaVersion">Versão SemVer do schema do checklist (ex.: "1.0.0").</param>
/// <param name="Language">Idioma ativo no preenchimento ("pt-BR" ou "en-US").</param>
/// <param name="AnswersJson">Objeto JSON serializado contendo apenas IDs e respostas do checklist.</param>
/// <param name="ClientUpdatedAtUtc">Data/hora UTC da última edição no cliente.</param>
/// <param name="ExpectedVersion">Versão otimista esperada para detecção de conflito em atualizações (nulo na primeira criação ou sobrescrita explícita).</param>
public sealed record UpsertUserKinkChecklistRequestDto(
    string SchemaVersion,
    string Language,
    string AnswersJson,
    DateTime ClientUpdatedAtUtc,
    int? ExpectedVersion = null);

/// <summary>
/// Representação pública do checklist persistido na tabela <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
/// <param name="Id">Identificador único do checklist persistido.</param>
/// <param name="SchemaVersion">Versão SemVer do schema do checklist.</param>
/// <param name="Language">Idioma ativo no preenchimento ("pt-BR" ou "en-US").</param>
/// <param name="AnswersJson">Objeto JSON serializado contendo apenas IDs e respostas do checklist.</param>
/// <param name="ClientUpdatedAtUtc">Data/hora UTC da última edição registrada pelo cliente.</param>
/// <param name="Version">Versão incremental usada para controle de concorrência otimista.</param>
/// <param name="CreatedAt">Data/hora UTC de criação do registro.</param>
/// <param name="UpdatedAt">Data/hora UTC da última atualização do registro.</param>
public sealed record UserKinkChecklistDto(
    long Id,
    string SchemaVersion,
    string Language,
    string AnswersJson,
    DateTime ClientUpdatedAtUtc,
    int Version,
    DateTime CreatedAt,
    DateTime UpdatedAt);
