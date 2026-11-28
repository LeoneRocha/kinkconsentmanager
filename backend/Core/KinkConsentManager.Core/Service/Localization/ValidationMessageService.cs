using System.Globalization;
using System.Resources;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using SmartCoreHub.Core.SDK.Domain.Exceptions;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Localization;

namespace KinkConsentManager.Core.Service.Localization;

/// <summary>
/// Serviço centralizado de resolução de recursos e múltiplos idiomas para validadores e respostas funcionais.
/// Unifica chaves nativas do <c>SmartCoreHub.Core.SDK</c> e os arquivos <c>.resx</c> de <c>KinkConsentManager.Core.Infrastructure</c>.
/// </summary>
public sealed class ValidationMessageService : IValidationMessageService, IErrorGetLocalizationService
{
    private const string SdkPrefix = "SmartCoreHub.Core.SDK.";
    private const string AuthPrefix = "Auth.";
    private const string ChecklistPrefix = "Checklist.";

    private static readonly ResourceManager ValidationResourceManager = new(
        "KinkConsentManager.Core.Infrastructure.Localization.Resources.ValidationMessages",
        typeof(ValidationMessageService).Assembly);

    private static readonly ResourceManager AuthResourceManager = new(
        "KinkConsentManager.Core.Infrastructure.Localization.Resources.AuthMessages",
        typeof(ValidationMessageService).Assembly);

    private static readonly ResourceManager ChecklistResourceManager = new(
        "KinkConsentManager.Core.Infrastructure.Localization.Resources.ChecklistMessages",
        typeof(ValidationMessageService).Assembly);

    private readonly IFunctionalMessageProvider _sdkMessageProvider;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="ValidationMessageService"/>.
    /// </summary>
    /// <param name="sdkMessageProvider">Provedor de mensagens funcionais do <c>SmartCoreHub.Core.SDK</c>.</param>
    public ValidationMessageService(IFunctionalMessageProvider sdkMessageProvider)
    {
        _sdkMessageProvider = sdkMessageProvider ?? throw new ArgumentNullException(nameof(sdkMessageProvider));
    }

    /// <inheritdoc />
    public string GetMessage(string messageKey, string fallbackMessage, params object[] args) =>
        GetMessage(messageKey, fallbackMessage, CultureInfo.CurrentUICulture, args);

    /// <inheritdoc />
    public string GetMessage(string messageKey, string fallbackMessage, CultureInfo? culture, params object[] args)
    {
        var targetCulture = culture ?? CultureInfo.CurrentUICulture;
        var safeFallback = fallbackMessage ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(messageKey))
        {
            if (messageKey.StartsWith(SdkPrefix, StringComparison.Ordinal))
            {
                var resolvedFromSdk = TryResolveFromSdk(messageKey, targetCulture);
                if (!string.IsNullOrWhiteSpace(resolvedFromSdk))
                {
                    return ApplyNamedOrIndexedFormatting(resolvedFromSdk, targetCulture, args);
                }
            }
            else
            {
                var manager = messageKey.StartsWith(AuthPrefix, StringComparison.Ordinal)
                    ? AuthResourceManager
                    : messageKey.StartsWith(ChecklistPrefix, StringComparison.Ordinal)
                        ? ChecklistResourceManager
                        : ValidationResourceManager;

                var rawFromResx = TryGetResourceString(manager, messageKey, targetCulture);
                if (!string.IsNullOrWhiteSpace(rawFromResx))
                {
                    return ApplyNamedOrIndexedFormatting(rawFromResx, targetCulture, args);
                }
            }
        }

        return ApplyNamedOrIndexedFormatting(safeFallback, targetCulture, args);
    }

    /// <inheritdoc />
    public Task<string> GetLocalizationAsync(
        string? errorCode,
        string fallback,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(errorCode))
        {
            return Task.FromResult(fallback);
        }

        return Task.FromResult(GetMessage(errorCode, fallback));
    }

    private string? TryResolveFromSdk(string messageKey, CultureInfo culture)
    {
        try
        {
            var resolved = _sdkMessageProvider.GetString(messageKey, culture);
            if (!string.IsNullOrWhiteSpace(resolved) &&
                !string.Equals(resolved, messageKey, StringComparison.Ordinal))
            {
                return resolved;
            }
        }
        catch (FunctionalMessageMissingException)
        {
            // Fallback controlado para a mensagem padrão em inglês quando a chave não existe no SDK.
        }

        return null;
    }

    private static string? TryGetResourceString(ResourceManager manager, string key, CultureInfo culture)
    {
        try
        {
            return manager.GetString(key, culture);
        }
        catch (MissingManifestResourceException)
        {
            return null;
        }
    }

    private static string ApplyNamedOrIndexedFormatting(string template, CultureInfo culture, object[]? args)
    {
        if (args is null || args.Length == 0 || string.IsNullOrEmpty(template))
        {
            return template;
        }

        var normalized = template
            .Replace("{PropertyName}", "{0}", StringComparison.Ordinal)
            .Replace("{MinLength}", "{1}", StringComparison.Ordinal)
            .Replace("{MaxLength}", "{1}", StringComparison.Ordinal);

        try
        {
            return string.Format(culture, normalized, args);
        }
        catch (FormatException)
        {
            return template;
        }
    }
}
