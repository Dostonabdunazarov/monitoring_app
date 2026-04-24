using System.Text.Json;

namespace IoT.Domain.Entities;

public class TelemetryEntry
{
    public Guid DeviceId { get; set; }
    public Guid TenantId { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public Guid MessageId { get; set; }
    public double? Temperature { get; set; }
    public double? Humidity { get; set; }
    public JsonDocument? Payload { get; set; }
}
