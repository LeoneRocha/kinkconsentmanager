using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KinkConsentManager.Core.Infrastructure.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class ReplaceEmailWithEmailHashLgpd : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserKinks_Email",
                schema: "kink_consent",
                table: "UserKinks");

            migrationBuilder.AddColumn<string>(
                name: "EmailHash",
                schema: "kink_consent",
                table: "UserKinks",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE kink_consent."UserKinks"
                SET "EmailHash" = upper(encode(sha256(convert_to(lower(trim("Email")), 'UTF8')), 'hex'))
                WHERE "Email" IS NOT NULL;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "EmailHash",
                schema: "kink_consent",
                table: "UserKinks",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Email",
                schema: "kink_consent",
                table: "UserKinks");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 1L,
                column: "EmailHash",
                value: "FFDD3421B537E0C70CB8D8931772925F40CD76561DDC566B6CDD017E420A2810");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 2L,
                column: "EmailHash",
                value: "5BA24FBC3AC450EC1740200753BC7C607D869AB010935DFBB1121D3315553A15");

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_EmailHash",
                schema: "kink_consent",
                table: "UserKinks",
                column: "EmailHash",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserKinks_EmailHash",
                schema: "kink_consent",
                table: "UserKinks");

            migrationBuilder.DropColumn(
                name: "EmailHash",
                schema: "kink_consent",
                table: "UserKinks");

            migrationBuilder.AddColumn<string>(
                name: "Email",
                schema: "kink_consent",
                table: "UserKinks",
                type: "character varying(191)",
                maxLength: 191,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Email",
                value: "admin@kinkconsentmanager.local");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Email",
                value: "user.kink@kinkconsentmanager.local");

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_Email",
                schema: "kink_consent",
                table: "UserKinks",
                column: "Email",
                unique: true);
        }
    }
}
