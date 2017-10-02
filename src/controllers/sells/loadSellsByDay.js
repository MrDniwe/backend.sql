const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");

module.exports = (token, storeUuid, date) => {
  return models.schedule
    .markItemAsPending(moment(date).format("YYYY-MM-DD"), storeUuid, "sell")
    .then(() =>
      cote.remoteRequester.send({
        type: "getSellsByDay",
        token: token,
        storeUuid: storeUuid,
        day: moment(date).format("YYYY-MM-DD")
      })
    )
    .then(loadResult => {
      if (loadResult.success) {
        return models.days
          .upsertOne({
            store_uuid: storeUuid,
            loaded_day: moment(date).format("YYYY-MM-DD"),
            document_type: "sell"
          })
          .then(loadedDay =>
            models.receipts
              .prepareRequestedItems(loadResult.documents, loadedDay)
              .then(preparedReceipts =>
                models.receipts.upsertMany(preparedReceipts)
              )
              .then(() =>
                Promise.each(loadResult.documents, receipt => {
                  let transactionsGroupedByType = _.groupBy(
                    receipt.transactions,
                    "type"
                  );
                  return Promise.all([
                    models.positions
                      .prepareRequestedItems(
                        transactionsGroupedByType["REGISTER_POSITION"],
                        receipt
                      )
                      .then(preparedPositions =>
                        models.positions.upsertMany(preparedPositions)
                      ),
                    models.payments
                      .prepareRequestedItems(
                        transactionsGroupedByType["PAYMENT"],
                        receipt
                      )
                      .then(preparedPayments =>
                        models.payments.upsertMany(preparedPayments)
                      )
                  ]);
                })
              )
              .then(() =>
                models.schedule.removeRowFromSchedule(
                  moment(date).format("YYYY-MM-DD"),
                  storeUuid,
                  "sell"
                )
              )
              .catch(err => {
                console.error(err);
                return models.days
                  .deleteByUuid(loadedDay.uuid)
                  .then(() =>
                    Promise.reject(
                      new Error(
                        `Не удалось сохранить продажи для дня ${loadedDay.loaded_day}`
                      )
                    )
                  );
              })
          );
      } else {
        return models.schedule.removeRowFromSchedule(
          moment(date).format("YYYY-MM-DD"),
          storeUuid,
          "sell"
        );
        //TODO логируем ошибку загрузки данных
      }
    })
    .catch(console.error);
};
