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
      return Promise.all([
        models.receipts.receiptsAvgAndQuantityByDaysOfWeek(
          req.payload.id,
          req.payload.from,
          req.payload.to
        )
      ]).spread(data =>
        Promise.resolve({
          data
        })
      );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
