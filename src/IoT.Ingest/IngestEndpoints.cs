using System.Text.Json;
using IoT.Domain.Entities;
using IoT.Infrastructure.Persistence;
using IoT.Shared.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace IoT.Ingest;

public static class IngestEndpoints
{
    public static IEndpointRouteBuilder MapIngestApi(this IEndpointRouteBuilder app)
    {
        app.MapPost("/ingest", IngestTelemetryAsync).WithTags("Ingest");
        app.MapPost("/ingest/telemetry", IngestTelemetryAsync).WithTags("Ingest");
        return app;
    }

    private static async Task<IResult> IngestTelemetryAsync(
        HttpRequest httpRequest,
        TelemetryIngestRequest request,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var rawToken = ReadBearerToken(httpRequest);
        if (rawToken is null)
        {
            return Results.Unauthorized();
        }

        var tokenHash = DeviceTokenHasher.Hash(rawToken);
        var deviceToken = await db.DeviceTokens
            .Include(t => t.Device)
            .SingleOrDefaultAsync(t => t.TokenHash == tokenHash && t.RevokedAt == null, cancellationToken);

        if (deviceToken is null)
        {
            return Results.Unauthorized();
        }

        if (request.MessageId == Guid.Empty)
        {
            return Results.BadRequest(new { error = "message_id is required" });
        }

        var timestamp = request.Timestamp ?? DateTimeOffset.UtcNow;
        var entry = new TelemetryEntry
        {
            DeviceId = deviceToken.DeviceId,
            TenantId = deviceToken.Device.TenantId,
            MessageId = request.MessageId,
            Timestamp = timestamp,
            Temperature = request.Temperature,
            Humidity = request.Humidity,
            Payload = request.Payload.ValueKind == JsonValueKind.Undefined
                ? null
                : JsonDocument.Parse(request.Payload.GetRawText())
        };

        var exists = await db.TelemetryEntries.AnyAsync(
            t => t.DeviceId == entry.DeviceId && t.MessageId == entry.MessageId,
            cancellationToken);

        if (!exists)
        {
            db.TelemetryEntries.Add(entry);
            await db.SaveChangesAsync(cancellationToken);
        }

        return Results.Accepted($"/api/devices/{entry.DeviceId}/telemetry", new { stored = !exists });
    }

    private static string? ReadBearerToken(HttpRequest request)
    {
        var authorization = request.Headers.Authorization.ToString();
        return authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? authorization["Bearer ".Length..].Trim()
            : null;
    }
}

public record TelemetryIngestRequest(
    Guid MessageId,
    DateTimeOffset? Timestamp,
    double? Temperature,
    double? Humidity,
    JsonElement Payload);
