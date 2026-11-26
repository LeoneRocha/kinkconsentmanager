using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KinkConsentManager.Core.Infrastructure.Migrations.PostgreSql
{
    /// <inheritdoc />
    public partial class InitialCreateAuth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "kink_consent");

            migrationBuilder.CreateTable(
                name: "UserKinks",
                schema: "kink_consent",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Login = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    NormalizedLogin = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(191)", maxLength: 191, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserKinks", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserKinkCheclists",
                schema: "kink_consent",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserKinkId = table.Column<long>(type: "bigint", nullable: false),
                    SchemaVersion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Language = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    AnswersJson = table.Column<string>(type: "jsonb", nullable: false),
                    ClientUpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserKinkCheclists", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserKinkCheclists_UserKinks_UserKinkId",
                        column: x => x.UserKinkId,
                        principalSchema: "kink_consent",
                        principalTable: "UserKinks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserKinkRefreshTokens",
                schema: "kink_consent",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserKinkId = table.Column<long>(type: "bigint", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    CreatedByIp = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserKinkRefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserKinkRefreshTokens_UserKinks_UserKinkId",
                        column: x => x.UserKinkId,
                        principalSchema: "kink_consent",
                        principalTable: "UserKinks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserKinkCheclists_AnswersJson_Gin",
                schema: "kink_consent",
                table: "UserKinkCheclists",
                column: "AnswersJson")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.CreateIndex(
                name: "IX_UserKinkCheclists_UserKinkId",
                schema: "kink_consent",
                table: "UserKinkCheclists",
                column: "UserKinkId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserKinkRefreshTokens_TokenHash",
                schema: "kink_consent",
                table: "UserKinkRefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserKinkRefreshTokens_UserKinkId",
                schema: "kink_consent",
                table: "UserKinkRefreshTokens",
                column: "UserKinkId");

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_Email",
                schema: "kink_consent",
                table: "UserKinks",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_IsActive",
                schema: "kink_consent",
                table: "UserKinks",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_Login",
                schema: "kink_consent",
                table: "UserKinks",
                column: "Login",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserKinks_NormalizedLogin",
                schema: "kink_consent",
                table: "UserKinks",
                column: "NormalizedLogin",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserKinkCheclists",
                schema: "kink_consent");

            migrationBuilder.DropTable(
                name: "UserKinkRefreshTokens",
                schema: "kink_consent");

            migrationBuilder.DropTable(
                name: "UserKinks",
                schema: "kink_consent");
        }
    }
}
