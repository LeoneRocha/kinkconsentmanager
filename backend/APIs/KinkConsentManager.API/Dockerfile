# Use the official .NET 10 runtime as base image
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

# Install curl for Docker Compose healthchecks (/health)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Use the SDK image to build the application
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Central package management, SDK pin and shared build props
COPY ["Directory.Build.props", "."]
COPY ["Directory.Packages.props", "."]
COPY ["global.json", "."]
COPY ["build/TestAssertions.props", "build/"]

# Copy production project files
COPY ["APIs/KinkConsentManager.API/KinkConsentManager.API.csproj", "APIs/KinkConsentManager.API/"]
COPY ["Core/KinkConsentManager.Core/KinkConsentManager.Core.csproj", "Core/KinkConsentManager.Core/"]

# Restore dependencies
RUN dotnet restore "APIs/KinkConsentManager.API/KinkConsentManager.API.csproj"

# Copy all source code
COPY . .

# Build the application
WORKDIR "/src/APIs/KinkConsentManager.API"
RUN dotnet build "KinkConsentManager.API.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "KinkConsentManager.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Create the final image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
# Garantir que os appsettings transformados estão presentes
COPY --from=publish /app/publish/appsettings*.json .

# Create a non-root user with a real home directory used by ASP.NET Data Protection
RUN groupadd -r kinkconsent && useradd -r -m -d /home/kinkconsent -g kinkconsent kinkconsent \
    && mkdir -p /home/kinkconsent/.aspnet/DataProtection-Keys /home/kinkconsent/cache/disk /app/cache/disk /app/data-protection-keys /app/logs \
    && chown -R kinkconsent:kinkconsent /app /home/kinkconsent
ENV HOME=/home/kinkconsent
USER kinkconsent

ENTRYPOINT ["dotnet", "KinkConsentManager.API.dll"]
