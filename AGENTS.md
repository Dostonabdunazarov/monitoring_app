# AGENTS.md

Guidance for coding agents working in this repository.

## Repository Layout

```
IOT_MONITORING_APP/
├── monitoring_app/          # .NET backend
│   ├── IoT.MonitoringApp.slnx
│   ├── docker-compose.yml
│   ├── docker/
│   └── src/
│       ├── IoT.Api.Host/
│       ├── IoT.Api/
│       ├── IoT.Domain/
│       ├── IoT.Infrastructure/
│       ├── IoT.Ingest/
│       ├── IoT.Shared/
│       └── IoT.Workers/
└── iot-monitoring-frontend/ # React frontend
```

## Project Overview

This is an IoT monitoring application.

- **Backend**: .NET with PostgreSQL/TimescaleDB — located in `monitoring_app/`
- **Frontend**: React (Vite) — located in `iot-monitoring-frontend/`

## Local Services

PostgreSQL with TimescaleDB is defined in `monitoring_app/docker-compose.yml`.

Default local database settings:

- Host: `localhost`
- Port: `5444`
- Database: `iot_monitoring`
- Username: `iot_user`
- Password: `iot_password`

Start the database:

```powershell
cd monitoring_app
docker compose up -d
```

## Build And Run

Build the solution:

```powershell
cd monitoring_app
dotnet build IoT.MonitoringApp.slnx
```

Run the API host:

```powershell
cd monitoring_app
dotnet run --project src/IoT.Api.Host/IoT.Api.Host.csproj
```

Run the worker:

```powershell
cd monitoring_app
dotnet run --project src/IoT.Workers/IoT.Workers.csproj
```

Run the frontend:

```powershell
cd iot-monitoring-frontend
npm install
npm run dev
```

## Backend: Database Notes

EF Core persistence lives under `monitoring_app/src/IoT.Infrastructure/Persistence`.

Important files:

- `AppDbContext.cs`
- `AppDbContextFactory.cs`
- `Configurations/*.cs`
- `Migrations/*.cs`

Tables currently include:

- `tenants`
- `users`
- `devices`
- `device_tokens`
- `telemetry`

`telemetry` is configured as a TimescaleDB hypertable.

When changing entity mappings, update the matching configuration class and create a migration. Keep table and column names in snake_case to match existing conventions.

## Code Style

- Follow the existing project layout and naming conventions.
- Keep domain entities in `IoT.Domain`.
- Keep EF Core-specific mapping in `IoT.Infrastructure`.
- Prefer small, focused changes over broad refactors.
- Do not mix unrelated cleanup into feature or bug-fix changes.
- Avoid committing generated files unless they are required by the project.

## Safety

- Do not reset, delete, or overwrite user changes.
- Before editing files, inspect the relevant existing code and preserve local conventions.
- Treat Docker volumes and database data as user state; do not remove them unless explicitly asked.
