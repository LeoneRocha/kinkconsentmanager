using Bogus;
using KinkConsentManager.Core.Domain.DTOs.Authentication;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Localization.MessageKeys;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Domain.Validators.Extensions;
using Moq;
using NUnit.Framework;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Tests.Domain.Validators;

[TestFixture]
public sealed class RegisterUserKinkRequestValidatorTests
{
    private readonly Faker _faker = new();
    private Mock<IUserKinkRepository> _userRepositoryMock = null!;
    private RegisterUserKinkRequestValidator _validator = null!;

    [SetUp]
    public void SetUp()
    {
        var messages = NullValidationMessageService.Instance;
        var passwordValidator = new PasswordValidator(messages);
        _userRepositoryMock = new Mock<IUserKinkRepository>();
        _userRepositoryMock
            .Setup(r => r.LoginExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _userRepositoryMock
            .Setup(r => r.EmailExistsAsync(It.IsAny<Email>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _validator = new RegisterUserKinkRequestValidator(
            passwordValidator,
            messages,
            _userRepositoryMock.Object);
    }

    [Test]
    public void Constructor_WhenRepositoryIsNull_ShouldThrowArgumentNullException()
    {
        // Cenário: Construção de RegisterUserKinkRequestValidator sem repositório de usuários.
        // Objetivo: Garantir que ArgumentNullException seja lançada para dependência obrigatória.
        var messages = NullValidationMessageService.Instance;
        var passwordValidator = new PasswordValidator(messages);

        Assert.Throws<ArgumentNullException>(() =>
            new RegisterUserKinkRequestValidator(passwordValidator, messages, null!));
    }

    [Test]
    public async Task ValidateAsync_WhenPayloadIsValidWithBogus_ShouldSucceed()
    {
        // Cenário: Requisição de cadastro completa gerada com dados válidos via Bogus.
        // Objetivo: Garantir que um payload válido e único não produza nenhuma falha de validação.
        var request = CreateValidRequest();

        var result = await _validator.ValidateAsync(request);

        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Test]
    public async Task ValidateAsync_WhenNameIsEmpty_ShouldFailWithNameRequired()
    {
        // Cenário: Nome vazio informado na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Name com ErrorCode e MessageKey RequiredField.
        var request = CreateValidRequest() with { Name = string.Empty };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameRequired",
            ValidationMessageKeys.RequiredField);
    }

    [Test]
    public async Task ValidateAsync_WhenNameIsTooShort_ShouldFailWithNameMin()
    {
        // Cenário: Nome com menos de 3 caracteres ("Al").
        // Objetivo: Validar comprimento mínimo de Name com MessageKey MinimumLength.
        var request = CreateValidRequest() with { Name = "Al" };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameMin",
            ValidationMessageKeys.MinimumLength);
    }

    [Test]
    public async Task ValidateAsync_WhenNameExceeds100Chars_ShouldFailWithNameMax()
    {
        // Cenário: Nome com 101 caracteres.
        // Objetivo: Validar limite máximo de Name com MessageKey MaximumLength.
        var request = CreateValidRequest() with { Name = new string('A', 101) };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Name),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.NameMax",
            ValidationMessageKeys.MaximumLength);
    }

    [Test]
    public async Task ValidateAsync_WhenLoginIsEmpty_ShouldFailWithLoginRequired()
    {
        // Cenário: Login vazio informado na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Login com MessageKey RequiredField.
        var request = CreateValidRequest() with { Login = string.Empty };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginRequired",
            ValidationMessageKeys.RequiredField);
    }

    [Test]
    public async Task ValidateAsync_WhenLoginIsTooShort_ShouldFailWithLoginMin()
    {
        // Cenário: Login com apenas 2 caracteres ("ab").
        // Objetivo: Validar comprimento mínimo de Login com MessageKey MinimumLength.
        var request = CreateValidRequest() with { Login = "ab" };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMin",
            ValidationMessageKeys.MinimumLength);
    }

    [Test]
    public async Task ValidateAsync_WhenLoginExceeds50Chars_ShouldFailWithLoginMax()
    {
        // Cenário: Login com 51 caracteres alfanuméricos válidos.
        // Objetivo: Validar limite máximo de Login com MessageKey MaximumLength.
        var request = CreateValidRequest() with { Login = new string('a', 51) };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginMax",
            ValidationMessageKeys.MaximumLength);
    }

    [TestCase("alex@silva")]
    [TestCase("alex silva")]
    [TestCase("alex.silva")]
    public async Task ValidateAsync_WhenLoginContainsInvalidCharacters_ShouldFailWithLoginChars(string invalidLogin)
    {
        // Cenário: Login contendo caracteres proibidos ('@', espaço ou ponto).
        // Objetivo: Garantir que apenas letras, números, '_' e '-' sejam aceitos no Login.
        var request = CreateValidRequest() with { Login = invalidLogin };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginChars",
            ValidationMessageKeys.LoginInvalidCharacters);
    }

    [Test]
    public async Task ValidateAsync_WhenEmailIsEmpty_ShouldFailWithEmailRequired()
    {
        // Cenário: E-mail vazio na requisição de cadastro.
        // Objetivo: Validar obrigatoriedade de Email com MessageKey RequiredField.
        var request = CreateValidRequest() with { Email = string.Empty };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailRequired",
            ValidationMessageKeys.RequiredField);
    }

    [TestCase("not-an-email")]
    [TestCase("user@")]
    [TestCase("@domain.com")]
    public async Task ValidateAsync_WhenEmailIsInvalid_ShouldFailWithEmailInvalid(string invalidEmail)
    {
        // Cenário: E-mail com formato inválido.
        // Objetivo: Validar formato de Email com MessageKey InvalidEmail.
        var request = CreateValidRequest() with { Email = invalidEmail };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailInvalid",
            ValidationMessageKeys.InvalidEmail);
    }

    [Test]
    public async Task ValidateAsync_WhenEmailExceeds191Chars_ShouldFailWithEmailMax()
    {
        // Cenário: E-mail sintaticamente válido porém com 192 caracteres.
        // Objetivo: Validar limite máximo de 191 caracteres em Email com MessageKey MaximumLength.
        var longEmail = new string('a', 180) + "@example.com";
        var request = CreateValidRequest() with { Email = longEmail };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailMax",
            ValidationMessageKeys.MaximumLength);
    }

    [Test]
    public async Task ValidateAsync_WhenPasswordIsWeak_ShouldDelegateToPasswordValidator()
    {
        // Cenário: Senha fraca sem caractere especial enviada no DTO de cadastro.
        // Objetivo: Garantir delegação para PasswordValidator preservando ErrorCode e MessageKey.
        var request = CreateValidRequest() with { Password = "WeakPassword1", ConfirmPassword = "WeakPassword1" };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.Password),
            "KinkConsentManager.Domain.PasswordValidator.Rule8",
            ValidationMessageKeys.PasswordSpecialCharRequired);
    }

    [Test]
    public async Task ValidateAsync_WhenConfirmPasswordDoesNotMatch_ShouldFailWithPasswordsDoNotMatch()
    {
        // Cenário: ConfirmPassword diferente de Password.
        // Objetivo: Garantir que divergência de senha falhe com MessageKey PasswordsDoNotMatch.
        var request = CreateValidRequest() with { ConfirmPassword = "Different@Password1" };

        var result = await _validator.ValidateAsync(request);

        AssertFailure(result, nameof(RegisterUserKinkRequestDto.ConfirmPassword),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.PasswordMatch",
            ValidationMessageKeys.PasswordsDoNotMatch);
    }

    [Test]
    public async Task ValidateAsync_WhenLoginAlreadyExists_ShouldFailWithLoginAlreadyExists()
    {
        // Cenário: Cadastro informando apenas login duplicado (e-mail único).
        // Objetivo: Garantir rejeição independente de Login com ErrorCode e MessageKey LoginAlreadyExists.
        var request = CreateValidRequest();
        _userRepositoryMock
            .Setup(r => r.LoginExistsAsync(request.Login, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _validator.ValidateAsync(request);

        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Login),
            RegisterUserKinkRequestValidator.LoginAlreadyExistsErrorCode,
            AuthenticationMessageKeys.LoginAlreadyExists);
    }

    [Test]
    public async Task ValidateAsync_WhenEmailAlreadyExists_ShouldFailWithEmailAlreadyExists()
    {
        // Cenário: Cadastro informando apenas e-mail duplicado (login único).
        // Objetivo: Garantir rejeição independente de Email com ErrorCode e MessageKey EmailAlreadyExists.
        var request = CreateValidRequest();
        _userRepositoryMock
            .Setup(r => r.EmailExistsAsync(new Email(request.Email), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _validator.ValidateAsync(request);

        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Email),
            RegisterUserKinkRequestValidator.EmailAlreadyExistsErrorCode,
            AuthenticationMessageKeys.EmailAlreadyExists);
    }

    [Test]
    public async Task ValidateAsync_WhenBothLoginAndEmailAlreadyExist_ShouldFailIndependentlyForBoth()
    {
        // Cenário: Cadastro em que tanto o Login quanto o E-mail já existem na base.
        // Objetivo: Garantir que ambas as regras de unicidade sejam avaliadas e reportadas de forma independente.
        var request = CreateValidRequest();
        _userRepositoryMock
            .Setup(r => r.LoginExistsAsync(request.Login, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _userRepositoryMock
            .Setup(r => r.EmailExistsAsync(new Email(request.Email), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _validator.ValidateAsync(request);

        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Login),
            RegisterUserKinkRequestValidator.LoginAlreadyExistsErrorCode,
            AuthenticationMessageKeys.LoginAlreadyExists);
        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Email),
            RegisterUserKinkRequestValidator.EmailAlreadyExistsErrorCode,
            AuthenticationMessageKeys.EmailAlreadyExists);
    }

    [Test]
    public async Task ValidateAsync_WhenEmailIsEmptyAndLoginAlreadyExists_ShouldValidateLoginUniquenessIndependently()
    {
        // Cenário: E-mail omitido (vazio) e login já existente informado.
        // Objetivo: Garantir que a unicidade de Login continue sendo validada de forma independente mesmo sem Email válido.
        var request = CreateValidRequest() with { Email = string.Empty };
        _userRepositoryMock
            .Setup(r => r.LoginExistsAsync(request.Login, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _validator.ValidateAsync(request);

        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Email),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.EmailRequired",
            ValidationMessageKeys.RequiredField);
        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Login),
            RegisterUserKinkRequestValidator.LoginAlreadyExistsErrorCode,
            AuthenticationMessageKeys.LoginAlreadyExists);
    }

    [Test]
    public async Task ValidateAsync_WhenLoginIsEmptyAndEmailAlreadyExists_ShouldValidateEmailUniquenessIndependently()
    {
        // Cenário: Login omitido (vazio) e e-mail já existente informado.
        // Objetivo: Garantir que a unicidade de Email continue sendo validada de forma independente mesmo sem Login informado.
        var request = CreateValidRequest() with { Login = string.Empty };
        _userRepositoryMock
            .Setup(r => r.EmailExistsAsync(new Email(request.Email), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _validator.ValidateAsync(request);

        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Login),
            "KinkConsentManager.Domain.RegisterUserKinkValidator.LoginRequired",
            ValidationMessageKeys.RequiredField);
        AssertFailure(
            result,
            nameof(RegisterUserKinkRequestDto.Email),
            RegisterUserKinkRequestValidator.EmailAlreadyExistsErrorCode,
            AuthenticationMessageKeys.EmailAlreadyExists);
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
