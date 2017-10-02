const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");

module.exports = req => {
  console.log(req.payload);
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ]).then(() =>
    Promise.all([
      models.receipts.receiptsAvgAndQuantityTotal(
        req.payload.id,
        req.payload.from,
        req.payload.to
      ),
      models.receipts.receiptsAvgAndQuantityByStores(
        req.payload.id,
        req.payload.from,
        req.payload.to
      ),
      models.receipts.receiptsAvgAndQuantityByDaysOfWeek(
        req.payload.id,
        req.payload.from,
        req.payload.to
      ),
      models.receipts.receiptsByPriceDiapasons(
        req.payload.id,
        req.payload.from,
        req.payload.to
      )
    ]).spread((total, byStores, byDays, byDiapasons) =>
      Promise.resolve({
        total: total,
        byStores: byStores,
        byDays: byDays,
        byDiapasons: byDiapasons
      })
    )
  );
};
