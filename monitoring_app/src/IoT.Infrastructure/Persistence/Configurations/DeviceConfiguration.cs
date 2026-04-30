using IoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IoT.Infrastructure.Persistence.Configurations;

public class DeviceConfiguration : IEntityTypeConfiguration<Device>
{
    public void Configure(EntityTypeBuilder<Device> builder)
    {
        builder.ToTable("devices");
        builder.HasKey(d => d.Id);
        builder.Property(d => d.Id).HasColumnName("id");
        builder.Property(d => d.TenantId).HasColumnName("tenant_id");
        builder.Property(d => d.Name).HasColumnName("name").IsRequired();
        builder.Property(d => d.Type).HasColumnName("type").IsRequired();
        builder.Property(d => d.Status).HasColumnName("status").HasConversion<string>();
        builder.Property(d => d.CreatedAt).HasColumnName("created_at");

        builder.HasIndex(d => new { d.TenantId, d.Id });
        builder.HasIndex(d => new { d.TenantId, d.Status });

        builder.HasOne(d => d.Tenant)
            .WithMany(t => t.Devices)
            .HasForeignKey(d => d.TenantId);
    }
}
