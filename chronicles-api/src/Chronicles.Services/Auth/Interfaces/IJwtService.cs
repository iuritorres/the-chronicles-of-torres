using Chronicles.Services.Auth.Models;

namespace Chronicles.Services.Auth.Interfaces;

public interface IJwtService
{
    public JwtTokenData GenerateToken(LoginDto usuario);
}
