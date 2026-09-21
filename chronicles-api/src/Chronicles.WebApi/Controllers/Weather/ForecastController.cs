using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Chronicles.Services.Weather.Interfaces;
using Chronicles.Services.Weather.Models;

namespace Chronicles.WebApi.Controllers.Weather;

[ApiController]
public class ForecastController(IForecastService forecastService) : ControllerBase
{
    private readonly IForecastService _forecastService = forecastService;

    [HttpGet("weatherforecast")]
    public async Task<ActionResult<WeatherForecast[]>> GetRandomWeatherForecast()
    {
        WeatherForecast[] forecasts = await _forecastService.GetRandomWeatherForecast();

        if (forecasts.Length == 0)
        {
            return NotFound();
        }

        return Ok(forecasts);
    }

    [Authorize]
    [HttpGet("hello-world")]
    public async Task<IActionResult> Test()
    {
        return Ok("Hello World");
    }
}
