using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace KinkConsentManager.Core.Infrastructure.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class AddUserKinkSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "kink_consent",
                table: "UserKinks",
                columns: new[] { "Id", "CreatedAt", "Email", "IsActive", "LastLoginAt", "Login", "Name", "NormalizedLogin", "PasswordHash", "UpdatedAt" },
                values: new object[,]
                {
                    { 1L, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "admin@kinkconsentmanager.local", true, null, "admin", "Admin Kink", "admin", "$2a$11$Avil9NTw2WW2CiU1ey5q8OSOaidQnX7lKEhhPqyq4gkAkXHEpOorC", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) },
                    { 2L, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "user.kink@kinkconsentmanager.local", true, null, "user.kink", "Demo User Kink", "user.kink", "$2a$11$DfVa0L0kLOnn3fD31R1BcOV5ByNv3OOG/cyO7mXP4DXJSA7q3nCZO", new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 1L);

            migrationBuilder.DeleteData(
                schema: "kink_consent",
                table: "UserKinks",
                keyColumn: "Id",
                keyValue: 2L);
        }
    }
}
