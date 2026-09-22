namespace Chronicles.Data;

public static class DbUtils
{
    public static string GetConnectionString()
    {
        var server = Environment.GetEnvironmentVariable("DB_SERVER");
        var port = Environment.GetEnvironmentVariable("DB_PORT");
        var database = Environment.GetEnvironmentVariable("DB_DATABASE");
        var user = Environment.GetEnvironmentVariable("DB_USER");
        var password = Environment.GetEnvironmentVariable("DB_PASSWORD");
        var pooling = Environment.GetEnvironmentVariable("DB_POOLING");

        if (string.IsNullOrEmpty(server))
        {
            throw new InvalidOperationException("Variável de ambiente DB_SERVER não definida");
        }

        if (string.IsNullOrEmpty(port))
        {
            throw new InvalidOperationException("Variável de ambiente DB_PORT não definida");
        }

        if (string.IsNullOrEmpty(database))
        {
            throw new InvalidOperationException("Variável de ambiente DB_DATABASE não definida");
        }

        if (string.IsNullOrEmpty(user))
        {
            throw new InvalidOperationException("Variável de ambiente DB_USER não definida");
        }

        if (string.IsNullOrEmpty(password))
        {
            throw new InvalidOperationException("Variável de ambiente DB_PASSWORD não definida");
        }

        if (string.IsNullOrEmpty(pooling))
        {
            throw new InvalidOperationException("Variável de ambiente DB_POOLING não definida");
        }

        return
            $"Host={server};Port={port};Database={database};Username={user};Password={password};Pooling={pooling}";
    }
}
