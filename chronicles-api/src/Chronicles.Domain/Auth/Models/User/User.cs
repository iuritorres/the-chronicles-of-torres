using Chronicles.Domain.Common;

namespace Chronicles.Domain.Auth.Models.User;

public class User : Entity
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string PasswordHash { get; set; }
}
