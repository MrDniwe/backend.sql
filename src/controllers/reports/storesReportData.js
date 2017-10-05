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
        models.stores.receiptsDataWithDelta(
          req.payload.id,
          previous,
          req.payload.from,
          req.payload.to
        ),
        models.positions.topSalesForEachClientsStore(
          req.payload.id,
          previous,
          req.payload.from,
          req.payload.to,
          5
        ),
        models.receipts.receiptsByTimeDiapasonListAndClientId(
          req.payload.id,
          req.payload.periods
        )
      ]).spread((stores, goods, basic) =>
        Promise.resolve({
          stores,
          goods,
          basic
        })
      );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
