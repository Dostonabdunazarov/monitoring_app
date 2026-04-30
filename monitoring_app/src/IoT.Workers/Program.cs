using IoT.Infrastructure.Persistence;
using IoT.Workers.ModbusGateway;
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opts =>
    opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<ModbusGatewayOptions>(
    builder.Configuration.GetSection(ModbusGatewayOptions.Section));

builder.Services.AddHostedService<ModbusGatewayWorker>();

var host = builder.Build();
host.Run();
