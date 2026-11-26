using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class RefreshTokenDtoValidatorTests
{
    private RefreshTokenDtoValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        _validator = new RefreshTokenDtoValidator(NullValidationMessageService.Instance);
    }

    [Test]
    public void Constructor_WhenMessageServiceIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Tentativa de instanciar RefreshTokenDtoValidator com dependência nula.
        // Objetivo: Garantir que ArgumentNullException seja lançada na inicialização.
        var act = () => new RefreshTokenDtoValidator(null!);

        act.Should().Throw<ArgumentNullException>();
    }

    [Test]
    public void Validate_WhenTokenIsWithinLimits_ShouldSucceed()
    {
        // Cenário: RefreshTokenDto com token não vazio de até 512 caracteres.
        // Objetivo: Garantir validação positiva para refresh token válido.
        var dto = new RefreshTokenDto { Token = new string('t', 86) };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeTrue();
    }

    [Test]
    public void Validate_WhenTokenIsEmpty_ShouldFailWithRequiredField()
    {
        // Cenário: RefreshTokenDto com Token vazio.
        // Objetivo: Garantir falha com ErrorCode Required e MessageKey RequiredField.
        var dto = new RefreshTokenDto { Token = string.Empty };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.RefreshTokenValidator.Required").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenTokenExceeds512Chars_ShouldFailWithRefreshTokenInvalid()
    {
        // Cenário: RefreshTokenDto com token de 513 caracteres.
        // Objetivo: Garantir falha com ErrorCode Max e MessageKey RefreshTokenInvalid.
        var dto = new RefreshTokenDto { Token = new string('t', 513) };

        var result = _validator.Validate(dto);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.RefreshTokenValidator.Max").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RefreshTokenInvalid);
    }
}
