namespace IoT.Workers.ModbusGateway;

public class ModbusGatewayOptions
{
    public const string Section = "ModbusGateway";

    public string Host { get; set; } = "192.168.1.100";
    public int Port { get; set; } = 502;
    public byte SlaveAddress { get; set; } = 1;
    public ushort TemperatureRegister { get; set; } = 0;
    public double TemperatureScale { get; set; } = 0.1; // register value * scale = °C
    public int PollIntervalSeconds { get; set; } = 5;
    public Guid DeviceId { get; set; }
    public Guid TenantId { get; set; }
}
