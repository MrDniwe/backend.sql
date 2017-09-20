module.exports = {
  rethink: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 28115,
    db: process.env.DB_NAME || "evotor_db_cache"
  }
};
