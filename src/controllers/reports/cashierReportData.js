const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const helpers = require("../../libs/helpers");

module.exports = req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ])
    .then(() =>
      constraints.clientFromTo(req.payload.id, req.payload.from, req.payload.to)
    )
    .then(() => {
      let previous = helpers.previousFromPayload(req.payload);
      return Promise.all([
        Promise.resolve("total"),
        Promise.resolve("reports"),
        Promise.resolve("chart")
      ]).spread((total, reports, chart) =>
        Promise.resolve({
          total: total,
          reports: reports,
          chart: chart
        })
      );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
