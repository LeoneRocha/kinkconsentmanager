using System.Globalization;
using FluentValidation.Results;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using Moq;

using NUnit.Framework;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class PasswordValidatorTests
{
    private Mock<IValidationMessageService> _messageServiceMock = null!;
    private PasswordValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        _messageServiceMock = new Mock<IValidationMessageService>();
        _messageServiceMock
            .Setup(m => m.GetMessage(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object[]>()))
            .Returns((string key, string fallback, object[] _) => $"{CultureInfo.CurrentUICulture.Name}:{key}:{fallback}");

        _validator = new PasswordValidator(_messageServiceMock.Object);
    }

    [Test]
    public void Constructor_WhenMessageServiceIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Tentativa de instanciar PasswordValidator com IValidationMessageService nulo.
        // Objetivo: Garantir que a guarda de construtor rejeite dependência nula com ArgumentNullException.
        var act = () => new PasswordValidator(null!);

        act.Should().Throw<ArgumentNullException>();
    }

    [TestCase("Strong@123")]
    [TestCase("Abcdefg1!")]
    [TestCase("Valid_Pass#2026")]
    public void Validate_WhenPasswordMeetsAllRules_ShouldSucceed(string password)
    {
        // Cenário: Senha que atende comprimento mínimo/máximo e todas as classes de caracteres sem espaços.
        // Objetivo: Garantir que senhas válidas passem em todas as 8 regras sem erros.
        var result = _validator.Validate(password);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Test]
    public void Validate_WhenPasswordIsEmpty_ShouldFailWithRequiredRuleAndMessageKey()
    {
        // Cenário: Senha vazia enviada ao validador.
        // Objetivo: Verificar falha na regra Rule1 com MessageKey RequiredField em CustomState.
        var result = _validator.Validate(string.Empty);

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule1", ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenPasswordIsShorterThan8Chars_ShouldFailWithMinimumLengthRule()
    {
        // Cenário: Senha com 7 caracteres contendo maiúscula, minúscula, dígito e especial.
        // Objetivo: Verificar falha na regra Rule2 com MessageKey MinimumLength.
        var result = _validator.Validate("Ab1!xyz");

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule2", ValidationMessageKeys.MinimumLength);
    }

    [Test]
    public void Validate_WhenPasswordExceeds100Chars_ShouldFailWithMaximumLengthRule()
    {
        // Cenário: Senha com 101 caracteres atendendo todos os requisitos de complexidade.
        // Objetivo: Verificar falha na regra Rule3 com MessageKey MaximumLength.
        var password = "Aa1!" + new string('x', 97);

        var result = _validator.Validate(password);

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule3", ValidationMessageKeys.MaximumLength);
    }

    [TestCase("Strong @1")]
    [TestCase("Strong\t@1")]
    [TestCase(" Strong@1")]
    public void Validate_WhenPasswordContainsWhitespace_ShouldFailWithNoWhitespaceRule(string password)
    {
        // Cenário: Senha contendo espaço em branco ou tabulação.
        // Objetivo: Verificar falha na regra Rule4 com MessageKey PasswordNoWhitespace.
        var result = _validator.Validate(password);

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule4", ValidationMessageKeys.PasswordNoWhitespace);
    }

    [Test]
    public void Validate_WhenPasswordHasNoUppercase_ShouldFailWithUppercaseRule()
    {
        // Cenário: Senha forte exceto pela ausência de letra maiúscula.
        // Objetivo: Verificar falha na regra Rule5 com MessageKey PasswordUppercaseRequired.
        var result = _validator.Validate("abcdef1!");

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule5", ValidationMessageKeys.PasswordUppercaseRequired);
    }

    [Test]
    public void Validate_WhenPasswordHasNoLowercase_ShouldFailWithLowercaseRule()
    {
        // Cenário: Senha forte exceto pela ausência de letra minúscula.
        // Objetivo: Verificar falha na regra Rule6 com MessageKey PasswordLowercaseRequired.
        var result = _validator.Validate("ABCDEF1!");

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule6", ValidationMessageKeys.PasswordLowercaseRequired);
    }

    [Test]
    public void Validate_WhenPasswordHasNoDigit_ShouldFailWithDigitRule()
    {
        // Cenário: Senha forte exceto pela ausência de dígito numérico.
        // Objetivo: Verificar falha na regra Rule7 com MessageKey PasswordDigitRequired.
        var result = _validator.Validate("Abcdefg!");

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule7", ValidationMessageKeys.PasswordDigitRequired);
    }

    [Test]
    public void Validate_WhenPasswordHasNoSpecialChar_ShouldFailWithSpecialCharRule()
    {
        // Cenário: Senha forte exceto pela ausência de caractere especial.
        // Objetivo: Verificar falha na regra Rule8 com MessageKey PasswordSpecialCharRequired.
        var result = _validator.Validate("Abcdefg1");

        result.IsValid.Should().BeFalse();
        AssertHasRuleFailure(result, "KinkConsentManager.Domain.PasswordValidator.Rule8", ValidationMessageKeys.PasswordSpecialCharRequired);
    }

    [Test]
    public void Validate_WhenCultureChangesBetweenCallsOnSameValidator_ShouldInvokeMessageServiceDynamically()
    {
        // Cenário: A mesma instância singleton/scoped de PasswordValidator é invocada primeiro em en-US e depois em pt-BR.
        // Objetivo: Comprovar que WithMessage(_ => ...) resolve mensagens dinamicamente por requisição, sem congelar o idioma da construção.
        var originalCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentUICulture = new CultureInfo("en-US");
            var englishResult = _validator.Validate("abcdef1!");

            CultureInfo.CurrentUICulture = new CultureInfo("pt-BR");
            var portugueseResult = _validator.Validate("abcdef1!");

            englishResult.Errors.Should().ContainSingle(e =>
                e.ErrorCode == "KinkConsentManager.Domain.PasswordValidator.Rule5" &&
                e.ErrorMessage.StartsWith("en-US:Validation.Password.UppercaseRequired:", StringComparison.Ordinal));

            portugueseResult.Errors.Should().ContainSingle(e =>
                e.ErrorCode == "KinkConsentManager.Domain.PasswordValidator.Rule5" &&
                e.ErrorMessage.StartsWith("pt-BR:Validation.Password.UppercaseRequired:", StringComparison.Ordinal));

            _messageServiceMock.Verify(
                m => m.GetMessage(ValidationMessageKeys.PasswordUppercaseRequired, It.IsAny<string>(), It.IsAny<object[]>()),
                Times.Exactly(2));
        }
        finally
        {
            CultureInfo.CurrentUICulture = originalCulture;
        }
    }

    private static void AssertHasRuleFailure(ValidationResult result, string expectedErrorCode, string expectedMessageKey)
    {
        var failure = result.Errors.Should().ContainSingle(e => e.ErrorCode == expectedErrorCode).Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(expectedMessageKey);
    }
}
