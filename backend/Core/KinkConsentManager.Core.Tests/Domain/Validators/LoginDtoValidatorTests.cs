using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class LoginDtoValidatorTests
{
    private LoginDtoValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        _validator = new LoginDtoValidator(NullValidationMessageService.Instance);
    }

    [Test]
    public void Constructor_WhenMessageServiceIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Construção de LoginDtoValidator com dependência nula.
        // Objetivo: Garantir que ArgumentNullException seja lançada na inicialização.
        var act = () => new LoginDtoValidator(null!);

        act.Should().Throw<ArgumentNullException>();
    }

    [TestCase("alex_silva", "Strong@123")]
    [TestCase("alex@example.com", "Strong@123")]
    public void Validate_WhenLoginDtoIsValid_ShouldSucceed(string loginOrEmail, string password)
    {
        // Cenário: LoginDto válido informado com login ou e-mail e senha dentro dos limites.
        // Objetivo: Garantir aprovação do contrato de entrada de autenticação.
        var dto = new LoginDto { LoginOrEmail = loginOrEmail, Password = password };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue();
    }

    [Test]
    public void Validate_WhenLoginOrEmailIsEmpty_ShouldFailWithRequiredField()
    {
        // Cenário: LoginOrEmail vazio no payload de login.
        // Objetivo: Verificar erro LoginOrEmailRequired com MessageKey RequiredField.
        var dto = new LoginDto { LoginOrEmail = string.Empty, Password = "Strong@123" };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.LoginValidator.LoginOrEmailRequired").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenLoginOrEmailExceeds191Chars_ShouldFailWithMaximumLength()
    {
        // Cenário: LoginOrEmail com 192 caracteres.
        // Objetivo: Verificar erro LoginOrEmailMax com MessageKey MaximumLength.
        var dto = new LoginDto { LoginOrEmail = new string('a', 192), Password = "Strong@123" };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.LoginValidator.LoginOrEmailMax").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.MaximumLength);
    }

    [Test]
    public void Validate_WhenPasswordIsEmpty_ShouldFailWithRequiredField()
    {
        // Cenário: Senha vazia no payload de login.
        // Objetivo: Verificar erro PasswordRequired com MessageKey RequiredField.
        var dto = new LoginDto { LoginOrEmail = "alex_silva", Password = string.Empty };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.LoginValidator.PasswordRequired").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenPasswordExceeds100Chars_ShouldFailWithMaximumLength()
    {
        // Cenário: Senha com 101 caracteres no payload de login.
        // Objetivo: Verificar erro PasswordMax com MessageKey MaximumLength.
        var dto = new LoginDto { LoginOrEmail = "alex_silva", Password = new string('p', 101) };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.LoginValidator.PasswordMax").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.MaximumLength);
    }
}
