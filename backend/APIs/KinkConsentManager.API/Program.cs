using KinkConsentManager.Core.Service.API.DI;
using Serilog;
using SmartCoreHub.Core.SDK.Infrastructure.Logging;
using SmartCoreHub.Core.SDK.Service.API.Helpers;

namespace KinkConsentManager.API;

/// <summary>
/// Ponto de entrada e composição do host da API.
/// </summary>
public partial class Program
{
    /// <summary>
    /// Inicializa o processo da API.
    /// </summary>
    /// <param name="args">Argumentos recebidos pela linha de comando.</param>
    public static void Main(string[] args)
    {
        ExecuteAsync(args).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Coordena configuração, execução e encerramento do host.
    /// </summary>
    /// <param name="args">Argumentos recebidos pela linha de comando.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Tarefa que representa a execução assíncrona.</returns>
    internal static async Task ExecuteAsync(string[] args, CancellationToken cancellationToken = default)
    {
        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Information()
            .WriteTo.Console()
            .CreateBootstrapLogger();

        Log.Information("KinkConsentManager API Loading at: {Time}", DateTime.UtcNow);
        LogAppHelper.PrintLogInformationVersionProduct(new SerilogAdapter(Log.Logger));

        try
        {
            var builder = CreateConfiguredBuilder(args);
            var app = BuildConfiguredApplication(builder);
            await RunApplicationAsync(app, cancellationToken);
        }
        catch (Exception ex) when (ex.GetType().Name != "HostAbortedException")
        {
            Log.Fatal(ex, "KinkConsentManager API terminated due to fatal error");
            Environment.ExitCode = 1;
        }
        finally
        {
            Log.Information("KinkConsentManager API stopped");
            await Log.CloseAndFlushAsync();
        }
    }

    /// <summary>
    /// Cria e configura o construtor do host Web.
    /// </summary>
    /// <param name="args">Argumentos recebidos pela linha de comando.</param>
    /// <returns>Construtor do host com configuração, Serilog e serviços registrados.</returns>
    internal static WebApplicationBuilder CreateConfiguredBuilder(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Configuration
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
            .AddEnvironmentVariables();

        builder.Host.UseSerilog((context, services, configuration) =>
            configuration.ReadFrom.Configuration(context.Configuration));

        WebApplicationBuilderServicesConfigure.Configure(builder);

        return builder;
    }

    /// <summary>
    /// Constrói a aplicação e configura o pipeline HTTP.
    /// </summary>
    /// <param name="builder">Construtor configurado do host Web.</param>
    /// <returns>Aplicação Web pronta para execução.</returns>
    internal static WebApplication BuildConfiguredApplication(WebApplicationBuilder builder)
    {
        var app = builder.Build();
        app.ConfigurePipeline();
        LogAppHelper.PrintLogInformationVersionProduct(new SerilogAdapter(Log.Logger));
        return app;
    }

    /// <summary>
    /// Executa a aplicação até o cancelamento.
    /// </summary>
    /// <param name="app">Aplicação Web a configurar ou executar.</param>
    /// <param name="cancellationToken">Token para cancelar a operação assíncrona.</param>
    /// <returns>Tarefa que representa a execução assíncrona.</returns>
    internal static Task RunApplicationAsync(WebApplication app, CancellationToken cancellationToken = default)
    {
        return app.RunAsync(cancellationToken);
    }
}
