using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Chronicles.Services.Auth.Implementations;
using Chronicles.Services.Auth.Interfaces;
using Chronicles.Services.Auth.Models;
using Chronicles.Services.Weather.Implementations;
using Chronicles.Services.Weather.Interfaces;
using Chronicles.Data.Context;
using Chronicles.Data.Interceptors;
using Microsoft.EntityFrameworkCore;
using Chronicles.Data;

namespace Chronicles.Core.IoC;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<DomainContext>(options => options
            .UseNpgsql(DbUtils.GetConnectionString())
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(new AuditableEntityInterceptor()));

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.ConfigureOptions<JwtBearerOptionsSetup>();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer();

        services.AddScoped<IJwtService, JwtService>();
        services.AddScoped<IForecastService, ForecastService>();

        return services;
    }
}
