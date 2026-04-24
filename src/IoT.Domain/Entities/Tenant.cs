namespace IoT.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Device> Devices { get; set; } = [];
}
