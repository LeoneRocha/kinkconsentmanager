using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.DTOs.Common;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class PasswordVerificationInputValidatorTests
{
    private PasswordVerificationInputValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        _validator = new PasswordVerificationInputValidator(NullValidationMessageService.Instance);
    }

    [Test]
    public void Constructor_WhenMessageServiceIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Construção de PasswordVerificationInputValidator com serviço de mensagens nulo.
        // Objetivo: Garantir que ArgumentNullException seja lançada na inicialização.
        var act = () => new PasswordVerificationInputValidator(null!);

        act.Should().Throw<ArgumentNullException>();
    }

    [Test]
    public void Validate_WhenPasswordAndHashArePresent_ShouldSucceed()
    {
        // Cenário: Par válido de senha em texto plano e hash armazenado.
        // Objetivo: Garantir que a validação de entrada para verificação criptográfica seja aprovada.
        var input = new PasswordVerificationInput
        {
            Password = "Strong@Password1",
            Hash = "$2a$11$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234"
        };

        var result = _validator.Validate(input);

        result.IsValid.Should().BeTrue();
    }

    [Test]
    public void Validate_WhenPasswordIsEmpty_ShouldFailWithRequiredField()
    {
        // Cenário: Password vazio informado na verificação de senha.
        // Objetivo: Verificar ErrorCode PasswordRequired e MessageKey RequiredField.
        var input = new PasswordVerificationInput
        {
            Password = string.Empty,
            Hash = "$2a$11$hash"
        };

        var result = _validator.Validate(input);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.PasswordVerificationValidator.PasswordRequired").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenHashIsEmpty_ShouldFailWithRequiredField()
    {
        // Cenário: Hash vazio informado na verificação de senha.
        // Objetivo: Verificar ErrorCode HashRequired e MessageKey RequiredField.
        var input = new PasswordVerificationInput
        {
            Password = "Strong@Password1",
            Hash = string.Empty
        };

        var result = _validator.Validate(input);

        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.ErrorCode == "KinkConsentManager.Domain.PasswordVerificationValidator.HashRequired").Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(ValidationMessageKeys.RequiredField);
    }
}
