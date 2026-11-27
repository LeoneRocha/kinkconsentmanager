using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KinkConsentManager.Core.Infrastructure.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class RemoveUserKinkNameColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Name",
                schema: "kink_consent",
                table: "UserKinks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Name",
                schema: "kink_consent",
                table: "UserKinks",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Name",
                value: "Admin Kink");

            migrationBuilder.UpdateData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Name",
                value: "Demo User Kink");
        }
    }
}
