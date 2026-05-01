using System.Net.Sockets;
using IoT.Domain.Entities;
using IoT.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NModbus;

namespace IoT.Workers.ModbusGateway;

public class ModbusGatewayWorker(
    ILogger<ModbusGatewayWorker> logger,
    IOptions<ModbusGatewayOptions> options,
    IServiceScopeFactory scopeFactory) : BackgroundService
{
    private readonly ModbusGatewayOptions _opts = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "ModbusGateway starting — target {Host}:{Port}, device {DeviceId}",
            _opts.Host, _opts.Port, _opts.DeviceId);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                double temperature = await ReadTemperatureAsync(stoppingToken);
                await SaveTelemetryAsync(temperature, stoppingToken);

                logger.LogInformation("Telemetry saved — temperature: {Temp:F1} °C", temperature);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to read/save telemetry, will retry in {Interval}s", _opts.PollIntervalSeconds);
            }

            await Task.Delay(TimeSpan.FromSeconds(_opts.PollIntervalSeconds), stoppingToken);
        }

        logger.LogInformation("ModbusGateway stopped.");
    }

    private async Task<double> ReadTemperatureAsync(CancellationToken ct)
    {
        using var tcpClient = new TcpClient();

        await tcpClient.ConnectAsync(_opts.Host, _opts.Port, ct);

        var factory = new ModbusFactory();
        using var master = factory.CreateMaster(tcpClient);

        // ТРМ1 хранит температуру как float IEEE 754 в двух Input Registers (функция 0x04)
        var registers = await Task.Run(
            () => master.ReadInputRegisters(_opts.SlaveAddress, _opts.TemperatureRegister, 2),
            ct);

        byte[] bytes = [
            (byte)(registers[1] & 0xFF),
            (byte)(registers[1] >> 8),
            (byte)(registers[0] & 0xFF),
            (byte)(registers[0] >> 8),
        ];
        return BitConverter.ToSingle(bytes, 0) * _opts.TemperatureScale;
    }

    private async Task SaveTelemetryAsync(double temperature, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var entry = new TelemetryEntry
        {
            DeviceId = _opts.DeviceId,
            TenantId = _opts.TenantId,
            Timestamp = DateTimeOffset.UtcNow,
            MessageId = Guid.NewGuid(),
            Temperature = temperature,
            Humidity = null,
        };

        db.TelemetryEntries.Add(entry);
        await db.SaveChangesAsync(ct);
    }
}
