module.exports = {
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "cache",
    user: process.env.DB_USERNAME || "cache",
    password: process.env.DB_PASSWORD || "cache"
  }
};
