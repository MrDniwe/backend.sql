module.exports = {
  delta: (current, previous) =>
    previous ? ((current - previous) / previous) : undefined,
};