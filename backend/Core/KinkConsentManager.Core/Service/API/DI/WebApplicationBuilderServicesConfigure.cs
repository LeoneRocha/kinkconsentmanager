using FluentValidation;
using KinkConsentManager.Core.Domain.Interfaces.Localization;
using KinkConsentManager.Core.Domain.Interfaces.Repositories;
using KinkConsentManager.Core.Domain.Interfaces.Services;
using KinkConsentManager.Core.Domain.Validators.Authentication;
using KinkConsentManager.Core.Infrastructure.Data;
using KinkConsentManager.Core.Infrastructure.Repositories;
using KinkConsentManager.Core.Service.Localization;
using KinkConsentManager.Core.Service.Mappings;
using KinkConsentManager.Core.Service.Security;
using KinkConsentManager.Core.Service.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartCoreHub.Core.SDK.Application.Cqrs.MediatR;
using SmartCoreHub.Core.SDK.Domain.Interfaces;
using SmartCoreHub.Core.SDK.Infrastructure.DependencyInjection;
using SmartCoreHub.Core.SDK.Infrastructure.Filters;
using SmartCoreHub.Core.SDK.Infrastructure.Repositories.Generic;
using SmartCoreHub.Core.SDK.Infrastructure.Security;
using SmartCoreHub.Core.SDK.Service.API.DI.Cors.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Documentation.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Hosting.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Mapping.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Observability.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Performance.Extensions;
using SmartCoreHub.Core.SDK.Service.API.DI.Primitives.Extensions;
using SmartCoreHub.Core.SDK.Service.DependenciesCollection.Extensions;
using SmartCoreHub.Core.SDK.Service.Security;

namespace KinkConsentManager.Core.Service.API.DI;

/// <summary>
/// Centraliza a composição e o registro de todos os serviços da aplicação no <see cref="WebApplicationBuilder"/>.
/// </summary>
public static class WebApplicationBuilderServicesConfigure
{
    /// <summary>
    /// Registra os serviços de hosting, aplicação, segurança JWT, persistência, CQRS,
    /// localização, documentação OpenAPI/Swagger, CORS, observabilidade e validação do grafo DI.
    /// </summary>
    /// <param name="builder">Builder da aplicação web.</param>
    public static void Configure(WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        // Hosting, Performance, Insights, ForwardedHeaders, DataProtection (Core.SDK)
        builder.Services.AddAspNetCoreApiBasics();
        builder.Services.AddSdkCorePrimitives(includeNullAppLogger: false);
        builder.AddApplicationInsightsIfConfigured();
        builder.AddApiPerformance();
        builder.Services.AddForwardedHeadersFromConfiguration(builder.Configuration, builder.Environment);
        builder.Services.AddFileSystemDataProtection(builder.Configuration, builder.Environment);

        // Localização Centralizada, FluentValidation, CQRS MediatRAdapter (Core.SDK), Banco Supabase, JWT
        builder.Services.AddSmartCoreHubFunctionalMessages(
            options => builder.Configuration.GetSection("Localization:FunctionalMessages").Bind(options),
            typeof(KinkConsentManagerDbContext).Assembly,
            "KinkConsentManager.Core.Infrastructure.Localization.Resources");
        builder.Services.AddScoped<IValidationMessageService, ValidationMessageService>();
        builder.Services.AddScoped<IErrorGetLocalizationService>(sp =>
            (ValidationMessageService)sp.GetRequiredService<IValidationMessageService>());
        builder.Services.AddValidatorsFromAssemblyContaining<RegisterUserKinkRequestValidator>();
        builder.Services.AddSmartCoreHubMediatRAdapter(typeof(WebApplicationBuilderServicesConfigure).Assembly);
        builder.Services.AddDatabase(builder.Configuration);
        builder.Services.AddScoped<ISecurityTokenAdapterFactory, SecurityTokenAdapterFactory>();
        builder.Services.AddScoped<IJwtAccessTokenService, JwtAccessTokenService>();
        builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
        builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(KinkConsentManagerGenericRepository<>));
        builder.Services.AddScoped<IUserKinkRepository, UserKinkRepository>();
        builder.Services.AddScoped<IUserKinkRefreshTokenRepository, UserKinkRefreshTokenRepository>();
        builder.Services.AddScoped<IUserKinkChecklistRepository, UserKinkChecklistRepository>();
        builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
        builder.Services.AddScoped<IUserKinkChecklistService, UserKinkChecklistService>();
        builder.Services.AddJwtAuthentication(builder.Configuration);

        // Registra o filtro do Core.SDK para traduzir envelopes ServiceResponse/ErrorResponse na resposta HTTP
        builder.Services.Configure<MvcOptions>(options =>
        {
            options.Filters.AddService<FunctionalMessageResultFilter>();
        });

        // Superfície HTTP: Swagger, OpenAPI, CORS (Core.SDK)
        var docs = KinkConsentManagerDocumentationOptions.Branding.CreateDocumentation(builder.Configuration);
        builder.Services.AddSingleton(docs);
        builder.Services.AddCustomSwagger(docs);
        builder.Services.AddCustomOpenApi(docs);
        builder.Services.AddCustomCors(
            builder.Configuration,
            builder.Environment,
            KinkConsentManagerDocumentationOptions.Branding.CreateCors());

        // Cross-cutting: Serilog, AutoMapper, validação de grafo DI (Core.SDK)
        builder.Services.AddSerilogAppLogger();
        builder.Services.AddSdkAutoMapper(typeof(AutoMapperProfile).Assembly);
        builder.Services.ValidateNoCircularDependencies();
    }
}
