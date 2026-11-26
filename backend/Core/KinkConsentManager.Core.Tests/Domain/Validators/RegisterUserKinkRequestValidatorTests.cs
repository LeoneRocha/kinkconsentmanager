using Bogus;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;

using NUnit.Framework;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class RegisterUserKinkRequestValidatorTests
{
    private readonly Faker _faker = new();
    private RegisterUserKinkRequestValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        var messages = NullValidationMessageService.Instance;
        var passwordValidator = new PasswordValidator(messages);
        _validator = new RegisterUserKinkRequestValidator(passwordValidator, messages);
    }

    [Test]
    public void Validate_WhenPayloadIsValidWithBogus_ShouldSucceed()
    {
        // Cenário: Requisição de cadastro completa gerada com dados válidos via Bogus.
        // Objetivo: Garantir que um payload válido não produza nenhuma falha de validação.
        var request = CreateValidRequest();

        var result = _validator.Validate(request);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Test]
    public void Validate_WhenNameIsEmpty_ShouldFailWithNameRequired()
    {
        // Cenário: Nome vazio informado na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Name com ErrorCode e MessageKey RequiredField.
        var request = CreateValidRequest() with { Name = string.Empty };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameRequired",
            ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenNameIsTooShort_ShouldFailWithNameMin()
    {
        // Cenário: Nome com menos de 3 caracteres ("Al").
        // Objetivo: Validar comprimento mínimo de Name com MessageKey MinimumLength.
        var request = CreateValidRequest() with { Name = "Al" };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameMin",
            ValidationMessageKeys.MinimumLength);
    }

    [Test]
    public void Validate_WhenNameExceeds100Chars_ShouldFailWithNameMax()
    {
        // Cenário: Nome com 101 caracteres.
        // Objetivo: Validar limite máximo de Name com MessageKey MaximumLength.
        var request = CreateValidRequest() with { Name = new string('A', 101) };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameMax",
            ValidationMessageKeys.MaximumLength);
    }

    [Test]
    public void Validate_WhenLoginIsEmpty_ShouldFailWithLoginRequired()
    {
        // Cenário: Login vazio informado na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Login com MessageKey RequiredField.
        var request = CreateValidRequest() with { Login = string.Empty };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginRequired",
            ValidationMessageKeys.RequiredField);
    }

    [Test]
    public void Validate_WhenLoginIsTooShort_ShouldFailWithLoginMin()
    {
        // Cenário: Login com apenas 2 caracteres ("ab").
        // Objetivo: Validar comprimento mínimo de Login com MessageKey MinimumLength.
        var request = CreateValidRequest() with { Login = "ab" };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMin",
            ValidationMessageKeys.MinimumLength);
    }

    [Test]
    public void Validate_WhenLoginExceeds50Chars_ShouldFailWithLoginMax()
    {
        // Cenário: Login com 51 caracteres alfanuméricos válidos.
        // Objetivo: Validar limite máximo de Login com MessageKey MaximumLength.
        var request = CreateValidRequest() with { Login = new string('a', 51) };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMax",
            ValidationMessageKeys.MaximumLength);
    }

    [TestCase("alex@silva")]
    [TestCase("alex silva")]
    [TestCase("alex.silva")]
    public void Validate_WhenLoginContainsInvalidCharacters_ShouldFailWithLoginChars(string invalidLogin)
    {
        // Cenário: Login contendo caracteres proibidos ('@', espaço ou ponto).
        // Objetivo: Garantir que apenas letras, números, '_' e '-' sejam aceitos no Login.
        var request = CreateValidRequest() with { Login = invalidLogin };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginChars",
            ValidationMessageKeys.LoginInvalidCharacters);
    }

    [Test]
    public void Validate_WhenEmailIsEmpty_ShouldFailWithEmailRequired()
    {
        // Cenário: E-mail vazio na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Email com MessageKey RequiredField.
        var request = CreateValidRequest() with { Email = string.Empty };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailRequired",
            ValidationMessageKeys.RequiredField);
    }

    [TestCase("not-an-email")]
    [TestCase("user@")]
    [TestCase("@domain.com")]
    public void Validate_WhenEmailIsInvalid_ShouldFailWithEmailInvalid(string invalidEmail)
    {
        // Cenário: E-mail com formato inválido.
        // Objetivo: Validar formato de Email com MessageKey InvalidEmail.
        var request = CreateValidRequest() with { Email = invalidEmail };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailInvalid",
            ValidationMessageKeys.InvalidEmail);
    }

    [Test]
    public void Validate_WhenEmailExceeds191Chars_ShouldFailWithEmailMax()
    {
        // Cenário: E-mail sintaticamente válido porém com 192 caracteres.
        // Objetivo: Validar limite máximo de 191 caracteres em Email com MessageKey MaximumLength.
        var longEmail = new string('a', 180) + "@example.com";
        var request = CreateValidRequest() with { Email = longEmail };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailMax",
            ValidationMessageKeys.MaximumLength);
    }

    [Test]
    public void Validate_WhenPasswordIsWeak_ShouldDelegateToPasswordValidator()
    {
        // Cenário: Senha fraca sem caractere especial enviada no DTO de cadastro.
        // Objetivo: Garantir delegação para PasswordValidator preservando ErrorCode e MessageKey.
        var request = CreateValidRequest() with { Password = "WeakPassword1", ConfirmPassword = "WeakPassword1" };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Password),
            "KinkConsentManager.Domain.PasswordValidator.Rule8",
            ValidationMessageKeys.PasswordSpecialCharRequired);
    }

    [Test]
    public void Validate_WhenConfirmPasswordDoesNotMatch_ShouldFailWithPasswordsDoNotMatch()
    {
        // Cenário: ConfirmPassword diferente de Password.
        // Objetivo: Garantir que divergência de senha falhe com MessageKey PasswordsDoNotMatch.
        var request = CreateValidRequest() with { ConfirmPassword = "Different@Password1" };

        var result = _validator.Validate(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.ConfirmPassword),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.PasswordMatch",
            ValidationMessageKeys.PasswordsDoNotMatch);
    }

    private RegisterUserKinkRequestDto CreateValidRequest()
    {
        const string password = "Strong@Password1";
        var login = $"user_{_faker.Random.AlphaNumeric(8)}";
        return new RegisterUserKinkRequestDto(
            Name: _faker.Name.FullName(),
            Login: login,
            Email: _faker.Internet.Email(),
            Password: password,
            ConfirmPassword: password);
    }

    private static void AssertFailure(
        FluentValidation.Results.ValidationResult result,
        string propertyName,
        string expectedErrorCode,
        string expectedMessageKey)
    {
        result.IsValid.Should().BeFalse();
        var failure = result.Errors.Should().ContainSingle(e =>
            e.PropertyName == propertyName && e.ErrorCode == expectedErrorCode).Subject;
        failure.CustomState.Should().BeOfType<FunctionalMessageKeyState>()
            .Which.MessageKey.Should().Be(expectedMessageKey);
    }
}
