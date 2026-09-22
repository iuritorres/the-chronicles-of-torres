using Chronicles.Domain.Auth.Models.User;
using Microsoft.EntityFrameworkCore;

namespace Chronicles.Data.Context;

public class DomainContext(DbContextOptions<DomainContext> options) : DbContext(options)
{
    #region Auth
    public DbSet<User> Users => Set<User>();
    #endregion

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DomainContext).Assembly);

        GuardAgainstMissingSchema(modelBuilder);
    }

    private static void GuardAgainstMissingSchema(ModelBuilder modelBuilder)
    {
        var leaked = modelBuilder.Model.GetEntityTypes()
            .Where(entityType => entityType.GetSchema() is null or "public")
            .Select(entityType => entityType.ClrType.Name)
            .ToList();

        if (leaked.Count > 0)
        {
            throw new InvalidOperationException(
                $"Entidades sem schema explícito: {string.Join(", ", leaked)}");
        }
    }
}
