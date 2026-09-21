using Microsoft.AspNetCore.Mvc;
using Chronicles.Services.Auth.Interfaces;
using Chronicles.Services.Auth.Models;

namespace Chronicles.WebApi.Controllers.Auth;

[ApiController]
[Route("auth")]
public class AuthController(IJwtService jwtService, IWebHostEnvironment environment) : ControllerBase
{
    private readonly IJwtService _jwtService = jwtService;
    private readonly IWebHostEnvironment _environment = environment;

    [HttpPost("login")]
    public async Task<ActionResult> Login([FromBody] LoginDto loginDto)
    {
        string correctEmail = "iuri.t1000@gmail.com";
        string correctPassword = "1234";

        if (!loginDto.Email.Equals(correctEmail) || !loginDto.Password.Equals(correctPassword))
        {
            return BadRequest(new { message = "Usuário Inválido" });
        }

        JwtTokenData tokenData = _jwtService.GenerateToken(loginDto);

        Response.Cookies.Append("access_token", tokenData.Token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Expires = tokenData.ExpiresAt
        });

        return Ok(new
        {
            message = "Login realizado com sucesso",
            expiresAt = tokenData.ExpiresAt
        });
    }
}
