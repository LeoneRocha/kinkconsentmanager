namespace KinkConsentManager.Core.Domain.Localization.MessageKeys;

/// <summary>
/// Chaves canônicas de mensagens funcionais do fluxo de persistência on-line do checklist.
/// </summary>
public static class ChecklistMessageKeys
{
    /// <summary>Checklist recuperado com sucesso.</summary>
    public const string ChecklistRetrieved = "Checklist.Retrieved";

    /// <summary>Checklist salvo on-line com sucesso.</summary>
    public const string ChecklistSaved = "Checklist.Saved";

    /// <summary>Preenchimento salvo removido com sucesso.</summary>
    public const string ChecklistDeleted = "Checklist.Deleted";

    /// <summary>Nenhum checklist salvo on-line encontrado para o usuário.</summary>
    public const string ChecklistNotFound = "Checklist.NotFound";

    /// <summary>Conflito de versão otimista ao salvar o checklist.</summary>
    public const string ChecklistVersionConflict = "Checklist.VersionConflict";
}
