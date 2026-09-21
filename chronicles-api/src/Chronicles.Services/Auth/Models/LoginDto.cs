namespace Chronicles.Services.Auth.Models;

public class LoginDto
{
    public required string Email { get; set; }
    public required string Password { get; set; }
}
