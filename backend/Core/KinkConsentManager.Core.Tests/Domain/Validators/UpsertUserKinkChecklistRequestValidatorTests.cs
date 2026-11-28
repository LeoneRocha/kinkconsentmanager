using System.Globalization;
using KinkConsentManager.Core.Domain.DTOs.Checklists;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Checklists;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Service.Localization;
using Microsoft.Extensions.DependencyInjection;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Infrastructure.DependencyInjection;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class UpsertUserKinkChecklistRequestValidatorTests
{
    private ServiceProvider _serviceProvider = null!;
    private UpsertUserKinkChecklistRequestValidator _validator = null!;

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

        _serviceProvider = services.BuildServiceProvider();
        var messages = _serviceProvider.GetRequiredService<IValidationMessageService>();
        _validator = new UpsertUserKinkChecklistRequestValidator(messages);
    }

    [TearDown]
    public void TearDown()
    {
        _serviceProvider.Dispose();
    }

    [Test]
    public async Task ValidateAsync_WhenPayloadIsValid_ShouldSucceed()
    {
        // Cenário: Payload válido com SemVer, idioma suportado, objeto JSON e ExpectedVersion positivo.
        // Objetivo: Garantir aprovação sem falhas de validação.
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            "{\"item_rope\":{\"primaryScale\":\"enjoy\"}}",
            DateTime.UtcNow,
            1);

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [TestCase("v1")]
    [TestCase("1.0")]
    [TestCase("abc")]
    public async Task ValidateAsync_WhenSchemaVersionIsNotSemVer_ShouldFailWithInvalidFormat(string invalidVersion)
    {
        // Cenário: SchemaVersion fora do padrão SemVer (ex.: "1.0" ou "v1").
        // Objetivo: Rejeitar com ValidationMessageKeys.InvalidFormat.
        var request = new UpsertUserKinkChecklistRequestDto(
            invalidVersion,
            "pt-BR",
            "{}",
            DateTime.UtcNow);

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(UpsertUserKinkChecklistRequestDto.SchemaVersion));
    }

    [TestCase("es-ES")]
    [TestCase("fr-FR")]
    public async Task ValidateAsync_WhenLanguageIsUnsupported_ShouldLocalizeMessageInEnAndPt(string unsupportedLanguage)
    {
        // Cenário: Idioma não suportado enviado com cultura ativa en-US e pt-BR.
        // Objetivo: Garantir erro Validation.Checklist.InvalidLanguage localizado dinamicamente.
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            unsupportedLanguage,
            "{}",
            DateTime.UtcNow);

        var originalCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = new CultureInfo("en-US");
            var enResult = await _validator.ValidateAsync(request);

            CultureInfo.CurrentUICulture = new CultureInfo("pt-BR");
            var ptResult = await _validator.ValidateAsync(request);

            enResult.IsValid.Should().BeFalse();
            ptResult.IsValid.Should().BeFalse();
            (enResult.Errors[0].CustomState as FunctionalMessageKeyState)?.MessageKey.Should().Be(ValidationMessageKeys.ChecklistInvalidLanguage);
            (ptResult.Errors[0].CustomState as FunctionalMessageKeyState)?.MessageKey.Should().Be(ValidationMessageKeys.ChecklistInvalidLanguage);
            enResult.Errors[0].ErrorMessage.Should().Contain("Supported languages");
            ptResult.Errors[0].ErrorMessage.Should().Contain("idiomas suportados");
        }
        finally
        {
            CultureInfo.CurrentUICulture = originalCulture;
        }
    }

    [TestCase("{invalid-json")]
    [TestCase("[1, 2, 3]")]
    [TestCase("\"string-only\"")]
    [TestCase("123")]
    public async Task ValidateAsync_WhenAnswersJsonIsMalformedOrNotJsonObject_ShouldFail(string invalidJson)
    {
        // Cenário: AnswersJson malformado ou raiz JSON que não seja Object (array, string, número).
        // Objetivo: Rejeitar com Validation.Checklist.InvalidJson.
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "en-US",
            invalidJson,
            DateTime.UtcNow);

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => (e.CustomState as FunctionalMessageKeyState) != null && ((FunctionalMessageKeyState)e.CustomState).MessageKey == ValidationMessageKeys.ChecklistInvalidJson);
    }

    [Test]
    public async Task ValidateAsync_WhenAnswersJsonExceeds512Kb_ShouldFailWithPayloadTooLarge()
    {
        // Cenário: Payload AnswersJson excedendo 524.288 bytes (512 KB).
        // Objetivo: Proteger banco e API contra payloads abusivos com Validation.Checklist.PayloadTooLarge.
        var largeContent = new string('a', UpsertUserKinkChecklistRequestValidator.MaxAnswersJsonBytes + 32);
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            $"{{\"item\":\"{largeContent}\"}}",
            DateTime.UtcNow);

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => (e.CustomState as FunctionalMessageKeyState) != null && ((FunctionalMessageKeyState)e.CustomState).MessageKey == ValidationMessageKeys.ChecklistPayloadTooLarge);
    }

    [TestCase(0)]
    [TestCase(-1)]
    public async Task ValidateAsync_WhenExpectedVersionIsNonPositive_ShouldFail(int expectedVersion)
    {
        // Cenário: ExpectedVersion informado com valor <= 0.
        // Objetivo: Garantir que ExpectedVersion seja >= 1 quando fornecido.
        var request = new UpsertUserKinkChecklistRequestDto(
            "1.0.0",
            "pt-BR",
            "{}",
            DateTime.UtcNow,
            expectedVersion);

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.PropertyName == nameof(UpsertUserKinkChecklistRequestDto.ExpectedVersion));
    }
}
