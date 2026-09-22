using Chronicles.Domain.Auth.Models.User;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Chronicles.Data.Configurations;

public class UserConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(property => property.Id);

        builder.Property(property => property.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(property => property.Email)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(property => property.PasswordHash)
            .IsRequired()
            .HasMaxLength(100);

        builder.ToTable("users", "auth");
    }
}
