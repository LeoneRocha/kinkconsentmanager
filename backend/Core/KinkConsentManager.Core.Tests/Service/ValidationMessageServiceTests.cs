using System.Globalization;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Service.Localization;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Domain.Interfaces.Localization;
using SmartCoreHub.Core.SDK.Infrastructure.DependencyInjection;

namespace KinkConsentManager.Core.Tests.Service;

[TestFixture]
public sealed class ValidationMessageServiceTests
{
    private ServiceProvider _serviceProvider = null!;
    private IValidationMessageService _messageService = null!;
    private IErrorGetLocalizationService _errorLocalizationService = null!;

    [SetUp]
    public void SetUp()
    {
        var services = new ServiceCollection();
        services.AddSmartCoreHubFunctionalMessages(
            options =>
            {
                options.DefaultCulture = new CultureInfo("en-US");
                options.SupportedCultures = new List<CultureInfo>
                {
                    new("en-US"),
                    new("pt-BR")
                };
            },
            typeof(KinkConsentManagerDbContext).Assembly,
            "KinkConsentManager.Core.Infrastructure.Localization.Resources");
        services.AddScoped<IValidationMessageService, ValidationMessageService>();
        services.AddScoped<IErrorGetLocalizationService>(sp =>
            (ValidationMessageService)sp.GetRequiredService<IValidationMessageService>());

        _serviceProvider = services.BuildServiceProvider();
        _messageService = _serviceProvider.GetRequiredService<IValidationMessageService>();
        _errorLocalizationService = _serviceProvider.GetRequiredService<IErrorGetLocalizationService>();
    }

    [TearDown]
    public void TearDown()
    {
        _serviceProvider.Dispose();
    }

    [Test]
    public void GetMessage_WhenUsingSdkValidationKeyInEnglishAndPortuguese_ShouldResolveAndInterpolatePlaceholders()
    {
        // Cenário: Resolução das chaves nativas SmartCoreHub.Core.SDK.Validation.* com placeholders {PropertyName}, {MinLength} e {MaxLength} em en-US e pt-BR.
        // Objetivo: Garantir integração real com IFunctionalMessageProvider e formatação distinta entre idiomas.
        var enCulture = new CultureInfo("en-US");
        var ptCulture = new CultureInfo("pt-BR");

        var requiredEn = _messageService.GetMessage(
            ValidationMessageKeys.RequiredField,
            "{PropertyName} is required.",
            enCulture,
            "Password");
        var requiredPt = _messageService.GetMessage(
            ValidationMessageKeys.RequiredField,
            "{PropertyName} is required.",
            ptCulture,
            "Password");

        var minEn = _messageService.GetMessage(
            ValidationMessageKeys.MinimumLength,
            "{PropertyName} must be at least {MinLength} characters.",
            enCulture,
            "Password",
            8);
        var minPt = _messageService.GetMessage(
            ValidationMessageKeys.MinimumLength,
            "{PropertyName} must be at least {MinLength} characters.",
            ptCulture,
            "Password",
            8);

        var maxEn = _messageService.GetMessage(
            ValidationMessageKeys.MaximumLength,
            "{PropertyName} must not exceed {MaxLength} characters.",
            enCulture,
            "Email",
            191);
        var maxPt = _messageService.GetMessage(
            ValidationMessageKeys.MaximumLength,
            "{PropertyName} must not exceed {MaxLength} characters.",
            ptCulture,
            "Email",
            191);

        requiredEn.Should().Contain("Password").And.NotBe(requiredPt);
        requiredPt.Should().Contain("Password");
        minEn.Should().Contain("Password").And.Contain("8").And.NotBe(minPt);
        minPt.Should().Contain("Password").And.Contain("8");
        maxEn.Should().Contain("Email").And.Contain("191").And.NotBe(maxPt);
        maxPt.Should().Contain("Email").And.Contain("191");
    }

    [TestCase(ValidationMessageKeys.PasswordNoWhitespace, "Password cannot contain whitespace.", "A senha não pode conter espaços em branco.")]
    [TestCase(ValidationMessageKeys.PasswordUppercaseRequired, "Password must contain at least one uppercase letter.", "A senha deve conter pelo menos uma letra maiúscula.")]
    [TestCase(ValidationMessageKeys.PasswordLowercaseRequired, "Password must contain at least one lowercase letter.", "A senha deve conter pelo menos uma letra minúscula.")]
    [TestCase(ValidationMessageKeys.PasswordDigitRequired, "Password must contain at least one number.", "A senha deve conter pelo menos um número.")]
    [TestCase(ValidationMessageKeys.PasswordSpecialCharRequired, "Password must contain at least one special character.", "A senha deve conter pelo menos um caractere especial.")]
    [TestCase(AuthenticationMessageKeys.InvalidCredentials, "Invalid login credentials.", "Credenciais de acesso inválidas.")]
    [TestCase(AuthenticationMessageKeys.RefreshTokenReused, "Refresh token reuse detected. All active sessions have been revoked.", "Reutilização de refresh token detectada. Todas as sessões ativas foram revogadas.")]
    public void GetMessage_WhenUsingProductKeys_ShouldResolveExactResxMessagesForBothCultures(
        string key,
        string expectedEn,
        string expectedPt)
    {
        // Cenário: Consulta de chaves de validação e autenticação específicas do produto em en-US e pt-BR.
        // Objetivo: Verificar leitura correta de ValidationMessages.resx e AuthMessages.resx em ambos os idiomas.
        var actualEn = _messageService.GetMessage(key, "fallback", new CultureInfo("en-US"));
        var actualPt = _messageService.GetMessage(key, "fallback", new CultureInfo("pt-BR"));

        actualEn.Should().Be(expectedEn);
        actualPt.Should().Be(expectedPt);
    }

    [Test]
    public void GetMessage_WhenKeyDoesNotExist_ShouldReturnFormattedFallbackSafely()
    {
        // Cenário: Chave inexistente solicitada com fallback contendo placeholders {PropertyName} e {MinLength}.
        // Objetivo: Garantir que o serviço nunca lance exceção e retorne o fallback devidamente interpolado.
        var result = _messageService.GetMessage(
            "Validation.Unknown.NonExistentKey",
            "{PropertyName} must be at least {MinLength} characters.",
            new CultureInfo("pt-BR"),
            "Login",
            3);

        result.Should().Be("Login must be at least 3 characters.");
    }

    [Test]
    public void GetMessage_WhenSdkKeyDoesNotExistInProvider_ShouldFallbackWithoutThrowing()
    {
        // Cenário: Chave iniciada com prefixo do SDK inexistente no IFunctionalMessageProvider.
        // Objetivo: Garantir captura controlada de FunctionalMessageMissingException com retorno do fallback.
        var result = _messageService.GetMessage(
            "SmartCoreHub.Core.SDK.Validation.DoesNotExist",
            "Fallback English message.",
            new CultureInfo("en-US"));

        result.Should().Be("Fallback English message.");
    }

    [Test]
    public async Task GetLocalizationAsync_ShouldResolveErrorCodeOrReturnFallbackWhenEmpty()
    {
        // Cenário: Uso de ValidationMessageService via IErrorGetLocalizationService para integração com FluentValidationErrorMappingHelper.
        // Objetivo: Validar retorno localizado para código válido e retorno do fallback quando errorCode for vazio.
        var originalCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = new CultureInfo("pt-BR");

            var localized = await _errorLocalizationService.GetLocalizationAsync(
                ValidationMessageKeys.PasswordDigitRequired,
                "Default fallback");
            var emptyFallback = await _errorLocalizationService.GetLocalizationAsync(
                null,
                "Default fallback");

            localized.Should().Be("A senha deve conter pelo menos um número.");
            emptyFallback.Should().Be("Default fallback");
        }
        finally
        {
            CultureInfo.CurrentUICulture = originalCulture;
        }
    }
}
