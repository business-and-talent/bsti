export async function createDatabasePool(config) {
  const { createPool } = await import('mysql2/promise');
  return createPool({
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    waitForConnections: true,
    connectionLimit: config.connectionLimit,
    queueLimit: 0,
    timezone: 'Z',
    charset: 'utf8mb4'
  });
}
