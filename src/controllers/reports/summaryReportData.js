const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const moment = require("moment");

module.exports = req => {
  console.log(req.payload);
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ])
    .then(() =>
      constraints.clientFromTo(req.payload.id, req.payload.from, req.payload.to)
    )
    .then(() => {
      let previous = moment(req.payload.from).subtract(
        req.payload.to - req.payload.from
      );
      return models.stores
        .exactOrAllStores(req.payload.id, req.payload.storeUuid)
        .then(storeUuids =>
          Promise.all([
            models.receipts.receiptsSummaryWithDeltaAndStore(
              previous,
              req.payload.from,
              req.payload.to,
              storeUuids
            )
          ]).spread(total =>
            Promise.resolve({
              total: total
            })
          )
        );
    })
    .catch(err => {
      console.error(err);
      Promise.reject(err);
    });
};
