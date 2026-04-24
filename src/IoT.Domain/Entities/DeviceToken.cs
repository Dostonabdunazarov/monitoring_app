namespace IoT.Domain.Entities;

public class DeviceToken
{
    public Guid Id { get; set; }
    public Guid DeviceId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }

    public bool IsActive => RevokedAt is null;

    public Device Device { get; set; } = null!;
}
