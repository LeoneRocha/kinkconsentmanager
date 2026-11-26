using FluentValidation;

namespace KinkConsentManager.Core.Domain.Validators.Extensions;

/// <summary>
/// Extensões para FluentValidation associando chaves semânticas de internacionalização ao estado da falha.
/// </summary>
public static class FluentValidationLocalizationExtensions
{
    /// <summary>Associa uma MessageKey canônica à regra de validação.</summary>
    /// <typeparam name="T">Tipo validado.</typeparam>
    /// <typeparam name="TProperty">Tipo da propriedade validada.</typeparam>
    /// <param name="rule">Regra configurada.</param>
    /// <param name="messageKey">Chave canônica da mensagem.</param>
    /// <returns>O próprio construtor de regra para encadeamento.</returns>
    public static IRuleBuilderOptions<T, TProperty> WithMessageKey<T, TProperty>(
        this IRuleBuilderOptions<T, TProperty> rule,
        string messageKey)
    {
        return rule.WithState(_ => new FunctionalMessageKeyState(messageKey));
    }
}

/// <summary>
/// Estado da falha de validação que carrega a MessageKey para leitura por <c>FluentValidationErrorMappingHelper</c>.
/// </summary>
public sealed class FunctionalMessageKeyState
{
    /// <summary>Inicializa uma nova instância de <see cref="FunctionalMessageKeyState"/>.</summary>
    /// <param name="messageKey">Chave canônica da mensagem.</param>
    /// <param name="payload">Payload opcional preservado na falha.</param>
    public FunctionalMessageKeyState(string messageKey, object? payload = null)
    {
        MessageKey = messageKey;
        Payload = payload;
    }

    /// <summary>Chave canônica da mensagem de validação.</summary>
    public string MessageKey { get; }

    /// <summary>Estado adicional associado à falha, quando existir.</summary>
    public object? Payload { get; }
}
