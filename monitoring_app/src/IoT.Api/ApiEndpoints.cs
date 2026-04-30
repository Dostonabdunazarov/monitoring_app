using System.Security.Claims;
using IoT.Domain.Entities;
using IoT.Domain.Enums;
using IoT.Infrastructure.Persistence;
using IoT.Shared.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace IoT.Api;

public static class ApiEndpoints
{
    public static IEndpointRouteBuilder MapDeviceEndpoints(this IEndpointRouteBuilder app)
    {
        var devices = app.MapGroup("/api/devices").RequireAuthorization().WithTags("Devices");
        devices.MapGet("/", GetDevicesAsync);
        devices.MapPost("/", CreateDeviceAsync).RequireAuthorization(policy => policy.RequireRole(UserRole.Admin.ToString()));
        devices.MapPut("/{deviceId:guid}", UpdateDeviceAsync).RequireAuthorization(policy => policy.RequireRole(UserRole.Admin.ToString()));
        devices.MapDelete("/{deviceId:guid}", DeleteDeviceAsync).RequireAuthorization(policy => policy.RequireRole(UserRole.Admin.ToString()));
        devices.MapPost("/{deviceId:guid}/tokens", IssueDeviceTokenAsync).RequireAuthorization(policy => policy.RequireRole(UserRole.Admin.ToString()));
        devices.MapGet("/{deviceId:guid}/telemetry", GetTelemetryAsync);

        return app;
    }

    private static async Task<IResult> GetDevicesAsync(
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null)
        {
            return Results.Forbid();
        }

        var devices = await db.Devices
            .Where(d => d.TenantId == tenantId)
            .OrderBy(d => d.Name)
            .Select(d => new DeviceResponse(d.Id, d.Name, d.Type, d.Status.ToString(), d.CreatedAt))
            .ToListAsync(cancellationToken);

        return Results.Ok(devices);
    }

    private static async Task<IResult> CreateDeviceAsync(
        CreateDeviceRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null)
        {
            return Results.Forbid();
        }

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Type))
        {
            return Results.BadRequest(new { error = "name and type are required" });
        }

        var device = new Device
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId.Value,
            Name = request.Name.Trim(),
            Type = request.Type.Trim(),
            Status = DeviceStatus.Active,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Devices.Add(device);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/devices/{device.Id}", new DeviceResponse(device.Id, device.Name, device.Type, device.Status.ToString(), device.CreatedAt));
    }

    private static async Task<IResult> UpdateDeviceAsync(
        Guid deviceId,
        UpdateDeviceRequest request,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null) return Results.Forbid();

        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.TenantId == tenantId, cancellationToken);
        if (device is null) return Results.NotFound();

        if (!string.IsNullOrWhiteSpace(request.Name)) device.Name = request.Name.Trim();
        if (!string.IsNullOrWhiteSpace(request.Type)) device.Type = request.Type.Trim();
        if (request.Status is not null && Enum.TryParse<DeviceStatus>(request.Status, ignoreCase: true, out var parsed))
            device.Status = parsed;

        await db.SaveChangesAsync(cancellationToken);
        return Results.Ok(new DeviceResponse(device.Id, device.Name, device.Type, device.Status.ToString(), device.CreatedAt));
    }

    private static async Task<IResult> DeleteDeviceAsync(
        Guid deviceId,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null) return Results.Forbid();

        var device = await db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId && d.TenantId == tenantId, cancellationToken);
        if (device is null) return Results.NotFound();

        db.Devices.Remove(device);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static async Task<IResult> IssueDeviceTokenAsync(
        Guid deviceId,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null)
        {
            return Results.Forbid();
        }

        var deviceExists = await db.Devices.AnyAsync(d => d.Id == deviceId && d.TenantId == tenantId, cancellationToken);
        if (!deviceExists)
        {
            return Results.NotFound();
        }

        var rawToken = DeviceTokenHasher.GenerateToken();
        var token = new DeviceToken
        {
            Id = Guid.NewGuid(),
            DeviceId = deviceId,
            TokenHash = DeviceTokenHasher.Hash(rawToken),
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.DeviceTokens.Add(token);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(new DeviceTokenResponse(rawToken, token.Id, token.CreatedAt));
    }

    private static async Task<IResult> GetTelemetryAsync(
        Guid deviceId,
        DateTimeOffset? from,
        DateTimeOffset? to,
        int? limit,
        ClaimsPrincipal principal,
        AppDbContext db,
        CancellationToken cancellationToken)
    {
        var tenantId = principal.GetTenantId();
        if (tenantId is null)
        {
            return Results.Forbid();
        }

        var take = Math.Clamp(limit ?? 100, 1, 1000);
        var query = db.TelemetryEntries
            .Where(t => t.TenantId == tenantId && t.DeviceId == deviceId);

        if (from is not null)
        {
            query = query.Where(t => t.Timestamp >= from);
        }

        if (to is not null)
        {
            query = query.Where(t => t.Timestamp <= to);
        }

        var telemetry = await query
            .OrderByDescending(t => t.Timestamp)
            .Take(take)
            .Select(t => new TelemetryResponse(t.DeviceId, t.MessageId, t.Timestamp, t.Temperature, t.Humidity, t.Payload))
            .ToListAsync(cancellationToken);

        return Results.Ok(telemetry);
    }
}

public record CreateDeviceRequest(string Name, string Type);
public record UpdateDeviceRequest(string? Name, string? Type, string? Status);
public record DeviceResponse(Guid Id, string Name, string Type, string Status, DateTimeOffset CreatedAt);
public record DeviceTokenResponse(string Token, Guid TokenId, DateTimeOffset CreatedAt);
public record TelemetryResponse(Guid DeviceId, Guid MessageId, DateTimeOffset Timestamp, double? Temperature, double? Humidity, object? Payload);
