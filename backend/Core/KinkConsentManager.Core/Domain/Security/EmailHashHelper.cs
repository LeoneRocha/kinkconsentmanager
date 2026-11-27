using System.Security.Cryptography;
using System.Text;
using SmartCoreHub.Core.SDK.Domain.ValueObjects;

namespace KinkConsentManager.Core.Domain.Security;

/// <summary>
/// Calcula e verifica o hash criptográfico irreversível de e-mails para conformidade LGPD,
/// utilizando SHA-256 determinístico sobre o endereço normalizado em minúsculas.
/// </summary>
public static class EmailHashHelper
{
    /// <summary>
    /// Calcula o hash SHA-256 em hexadecimal maiúsculo para o Value Object <see cref="Email"/> já normalizado.
    /// </summary>
    /// <param name="email">Value Object de e-mail válido e normalizado.</param>
    /// <returns>Representação hexadecimal em maiúsculas (64 caracteres) do hash SHA-256.</returns>
    public static string ComputeHash(Email email)
    {
        ArgumentNullException.ThrowIfNull(email);

        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(email.Value));
        return Convert.ToHexString(hashBytes);
    }

    /// <summary>
    /// Normaliza o e-mail bruto via <see cref="Email"/> e calcula o hash SHA-256 em hexadecimal maiúsculo.
    /// </summary>
    /// <param name="rawEmail">Endereço de e-mail em texto plano.</param>
    /// <returns>Representação hexadecimal em maiúsculas (64 caracteres) do hash SHA-256.</returns>
    public static string ComputeHash(string rawEmail)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(rawEmail);

        var email = new Email(rawEmail.Trim());
        return ComputeHash(email);
    }

    /// <summary>
    /// Verifica em tempo constante se um e-mail bruto corresponde ao hash armazenado.
    /// </summary>
    /// <param name="rawEmail">Endereço de e-mail informado para conferência.</param>
    /// <param name="expectedHash">Hash SHA-256 hexadecimal persistido no banco de dados.</param>
    /// <returns><c>true</c> quando o e-mail é válido e seu hash coincide com <paramref name="expectedHash"/>; caso contrário, <c>false</c>.</returns>
    public static bool VerifyEmail(string rawEmail, string expectedHash)
    {
        if (string.IsNullOrWhiteSpace(rawEmail) || string.IsNullOrWhiteSpace(expectedHash))
        {
            return false;
        }

        try
        {
            var computed = ComputeHash(rawEmail);
            var normalizedExpected = expectedHash.Trim().ToUpperInvariant();

            var computedBytes = Encoding.ASCII.GetBytes(computed);
            var expectedBytes = Encoding.ASCII.GetBytes(normalizedExpected);

            return computedBytes.Length == expectedBytes.Length &&
                   CryptographicOperations.FixedTimeEquals(computedBytes, expectedBytes);
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
