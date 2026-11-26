using SmartCoreHub.Core.SDK.Domain.Entities.Common;

namespace KinkConsentManager.Core.Domain.Entities;

/// <summary>
/// Armazena o rascunho/relatório de respostas do checklist do usuário em formato jsonb no Supabase.
/// </summary>
public class UserKinkCheclist : LongEntityBase
{
    /// <summary>Identificador do usuário proprietário (1:1 na V2).</summary>
    public long UserKinkId { get; set; }

    /// <summary>Versão do schema estrutural do checklist (ex.: "1.0.0").</summary>
    public string SchemaVersion { get; set; } = "1.0.0";

    /// <summary>Idioma preferido do rascunho ("pt-BR" ou "en-US").</summary>
    public string Language { get; set; } = "pt-BR";

    /// <summary>Payload JSON das respostas (mapeado como coluna nativa jsonb no PostgreSQL).</summary>
    public string AnswersJson { get; set; } = "{}";

    /// <summary>Timestamp UTC da última modificação no cliente.</summary>
    public DateTime ClientUpdatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>Versão incremental para controle de concorrência otimista.</summary>
    public int Version { get; set; } = 1;

    /// <summary>Usuário proprietário do relatório.</summary>
    public virtual UserKink UserKink { get; set; } = null!;
}
