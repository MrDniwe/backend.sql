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
        Promise.resolve("barchart"),
        Promise.resolve("piechart")
      ]).spread((barchart, piechart) =>
        Promise.resolve({
          barchart,
          piechart
        })
      );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
