using IoT.Domain.Enums;

namespace IoT.Domain.Entities;

public class Device
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DeviceStatus Status { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;
    public ICollection<DeviceToken> Tokens { get; set; } = [];
}
