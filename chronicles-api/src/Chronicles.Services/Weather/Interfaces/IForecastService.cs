using Chronicles.Services.Weather.Models;

namespace Chronicles.Services.Weather.Interfaces;

public interface IForecastService
{
    public Task<WeatherForecast[]> GetRandomWeatherForecast();
}
