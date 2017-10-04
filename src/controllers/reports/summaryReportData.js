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
      return models.stores
        .exactOrAllStores(req.payload.id, req.payload.storeUuid)
        .then(storeUuids =>
          Promise.all([
            models.receipts.receiptsSummaryWithDeltaAndStore(
              previous,
              req.payload.from,
              req.payload.to,
              storeUuids
            ),
            models.payments.paymentsSumByTypesAndStoresWithDelta(
              previous,
              req.payload.from,
              req.payload.to,
              storeUuids
            ),
            models.receipts.receiptsByTimeDiapasonListAndGivenStores(
              req.payload.periods,
              storeUuids
            )
          ]).spread((total, payments, periods) =>
            Promise.resolve({
              total: total,
              payments: payments,
              periods: periods
            })
          )
        );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
