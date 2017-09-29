module.exports = {
  postgres: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || "cache",
    user: process.env.DB_USERNAME || "cache",
    password: process.env.DB_PASSWORD || "cache"
  },
  schedule: {
    daysToLoad: 182,
    temporaryReloadCycle: "1 hour",
    closePending: "5 mins",
    scheduleTimeoutMs: 20000,
    simultaneousOperations: 10
  }
};
