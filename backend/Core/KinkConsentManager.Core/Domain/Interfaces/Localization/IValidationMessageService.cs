using System.Globalization;

namespace KinkConsentManager.Core.Domain.Interfaces.Localization;

/// <summary>
/// Contrato centralizado de resolução multi-idioma e resources para validadores de domínio.
/// Mantém o Domain desacoplado de ResourceManager, arquivos .resx e HttpContext.
/// </summary>
public interface IValidationMessageService
{
    /// <summary>Obtém a mensagem localizada para a cultura atual da requisição ou retorna o fallback.</summary>
    /// <param name="messageKey">Chave canônica da mensagem.</param>
    /// <param name="fallbackMessage">Mensagem padrão em inglês quando a chave não estiver disponível.</param>
    /// <param name="args">Argumentos opcionais para interpolação.</param>
    /// <returns>Texto localizado formatado.</returns>
    string GetMessage(string messageKey, string fallbackMessage, params object[] args);

    /// <summary>Obtém a mensagem localizada para a cultura explicitamente informada ou retorna o fallback.</summary>
    /// <param name="messageKey">Chave canônica da mensagem.</param>
    /// <param name="fallbackMessage">Mensagem padrão em inglês quando a chave não estiver disponível.</param>
    /// <param name="culture">Cultura alvo.</param>
    /// <param name="args">Argumentos opcionais para interpolação.</param>
    /// <returns>Texto localizado formatado.</returns>
    string GetMessage(string messageKey, string fallbackMessage, CultureInfo? culture, params object[] args);
}

/// <summary>Implementação neutra (Null Object) útil em testes unitários puramente estruturais.</summary>
public sealed class NullValidationMessageService : IValidationMessageService
{
    /// <summary>Instância singleton padrão.</summary>
    public static readonly NullValidationMessageService Instance = new();

    /// <inheritdoc />
    public string GetMessage(string messageKey, string fallbackMessage, params object[] args)
    {
        if (args is null || args.Length == 0)
        {
            return fallbackMessage;
        }

        var normalized = fallbackMessage
            .Replace("{PropertyName}", "{0}", StringComparison.Ordinal)
            .Replace("{MinLength}", "{1}", StringComparison.Ordinal)
            .Replace("{MaxLength}", "{1}", StringComparison.Ordinal);

        try
        {
            return string.Format(CultureInfo.InvariantCulture, normalized, args);
        }
        catch (FormatException)
        {
            return fallbackMessage;
        }
    }

    /// <inheritdoc />
    public string GetMessage(string messageKey, string fallbackMessage, CultureInfo? culture, params object[] args) =>
        GetMessage(messageKey, fallbackMessage, args);
}
