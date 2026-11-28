namespace KinkConsentManager.Core.Domain.Interfaces.Services;

/// <summary>
/// Contrato para proteção em repouso (compressão Zstandard + criptografia autenticada AES-GCM)
/// do conteúdo <c>AnswersJson</c> armazenado na tabela <c>kink_consent.UserKinkCheclists</c>.
/// </summary>
public interface IChecklistPayloadProtector
{
    /// <summary>
    /// Comprime e criptografa o JSON em texto claro das respostas do checklist, retornando um envelope JSON válido
    /// compatível com a coluna <c>jsonb</c> do PostgreSQL.
    /// </summary>
    /// <param name="plainAnswersJson">JSON em texto claro com as respostas do usuário.</param>
    /// <returns>Envelope JSON protegido (ou o texto original quando a proteção estiver desabilitada).</returns>
    string Protect(string plainAnswersJson);

    /// <summary>
    /// Descriptografa e descomprime um envelope protegido armazenado no banco de dados.
    /// Caso o valor recebido seja um JSON legado sem envelope de proteção, retorna o conteúdo original sem alterações.
    /// </summary>
    /// <param name="storedAnswersJson">Valor armazenado na coluna <c>AnswersJson</c>.</param>
    /// <returns>JSON em texto claro das respostas do usuário.</returns>
    string Unprotect(string storedAnswersJson);
}
