using IoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IoT.Infrastructure.Persistence.Configurations;

public class TelemetryEntryConfiguration : IEntityTypeConfiguration<TelemetryEntry>
{
    public void Configure(EntityTypeBuilder<TelemetryEntry> builder)
    {
        builder.ToTable("telemetry");
        builder.HasKey(t => new { t.DeviceId, t.Timestamp, t.MessageId });

        builder.Property(t => t.DeviceId).HasColumnName("device_id");
        builder.Property(t => t.TenantId).HasColumnName("tenant_id");
        builder.Property(t => t.Timestamp).HasColumnName("timestamp");
        builder.Property(t => t.MessageId).HasColumnName("message_id");
        builder.Property(t => t.Temperature).HasColumnName("temperature");
        builder.Property(t => t.Humidity).HasColumnName("humidity");
        builder.Property(t => t.Payload).HasColumnName("payload").HasColumnType("jsonb");

        builder.HasIndex(t => new { t.TenantId, t.Timestamp });
        builder.HasIndex(t => new { t.DeviceId, t.Timestamp });
    }
}
