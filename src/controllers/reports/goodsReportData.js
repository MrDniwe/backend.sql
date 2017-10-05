const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const helpers = require("../../libs/helpers");
const _ = require("lodash");

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
      req.payload.pieChartLimit = _.toInteger(req.payload.pieChartLimit) || 9;
      return Promise.all([
        models.stores
          .exactOrAllStores(req.payload.id, req.payload.storeUuid)
          .then(storeUuids =>
            models.receipts.receiptsByTimeDiapasonListAndGivenStores(
              req.payload.periods,
              storeUuids
            )
          ),
        models.stores.clientStoresSellsList(
          req.payload.id,
          req.payload.storeUuid,
          previous,
          req.payload.from,
          req.payload.to,
          req.payload.pieChartLimit
        )
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
