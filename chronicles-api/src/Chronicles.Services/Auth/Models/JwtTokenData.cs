namespace Chronicles.Services.Auth.Models;

public sealed record JwtTokenData
{
    public required string Token { get; init; }
    public required DateTime ExpiresAt { get; init; }
}
