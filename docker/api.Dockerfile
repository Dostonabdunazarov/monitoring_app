FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY monitoring_app/src/IoT.Api.Host/IoT.Api.Host.csproj monitoring_app/src/IoT.Api.Host/
COPY monitoring_app/src/IoT.Api/IoT.Api.csproj monitoring_app/src/IoT.Api/
COPY monitoring_app/src/IoT.Domain/IoT.Domain.csproj monitoring_app/src/IoT.Domain/
COPY monitoring_app/src/IoT.Infrastructure/IoT.Infrastructure.csproj monitoring_app/src/IoT.Infrastructure/
COPY monitoring_app/src/IoT.Ingest/IoT.Ingest.csproj monitoring_app/src/IoT.Ingest/
COPY monitoring_app/src/IoT.Shared/IoT.Shared.csproj monitoring_app/src/IoT.Shared/
RUN dotnet restore monitoring_app/src/IoT.Api.Host/IoT.Api.Host.csproj

COPY monitoring_app/ monitoring_app/
RUN dotnet publish monitoring_app/src/IoT.Api.Host/IoT.Api.Host.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "IoT.Api.Host.dll"]
