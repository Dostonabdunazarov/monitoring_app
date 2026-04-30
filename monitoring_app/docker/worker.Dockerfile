FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY monitoring_app/src/IoT.Workers/IoT.Workers.csproj monitoring_app/src/IoT.Workers/
COPY monitoring_app/src/IoT.Domain/IoT.Domain.csproj monitoring_app/src/IoT.Domain/
COPY monitoring_app/src/IoT.Infrastructure/IoT.Infrastructure.csproj monitoring_app/src/IoT.Infrastructure/
COPY monitoring_app/src/IoT.Shared/IoT.Shared.csproj monitoring_app/src/IoT.Shared/
RUN dotnet restore monitoring_app/src/IoT.Workers/IoT.Workers.csproj

COPY monitoring_app/ monitoring_app/
RUN dotnet publish monitoring_app/src/IoT.Workers/IoT.Workers.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/runtime:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "IoT.Workers.dll"]
