const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");

module.exports = req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req),
    constraints.tokenPresents(req)
  ])
    .then(() => {
      // реквестируем из БД магазины клиента
      return models.stores.getClientStores(req.payload.id);
    })
    .then(stores => {
      //с недостающими делаем удаленный запрос, в случае ошибки не крошимся
      return Promise.map(stores, store => {
        let preparedPayload = _.map(req.payload.days, day =>
          moment(day).format("YYYY-MM-DD")
        );
        return models.days
          .onlyLoadedDays(store.uuid, "sell", preparedPayload)
          .then(allreadyLoaded =>
            _.map(allreadyLoaded, day => moment(day).utc().format("YYYY-MM-DD"))
          )
          .then(momented => _.difference(preparedPayload, momented))
          .then(daysToLoad =>
            cote.remoteRequester
              .send({
                type: "getSellsByDays",
                token: req.payload.token,
                storeUuid: store.uuid,
                days: daysToLoad
              })
              .then(days =>
                Promise.resolve({ storeUuid: store.uuid, days: days })
              )
          );
      });
    })
    .then(storesDaysDocs => {
      return Promise.each(storesDaysDocs, storeDaysDocs => {
        let onlySuccessesDays = _.filter(storeDaysDocs.days, "success");
        return Promise.map(onlySuccessesDays, dayDocs =>
          models.days
            .upsertOne({
              store_uuid: storeDaysDocs.storeUuid,
              loaded_day: moment(dayDocs.day).utc().format("YYYY-MM-DD"),
              document_type: "sell"
            })
            .then(loadedDay =>
              models.receipts
                .prepareRequestedItems(dayDocs.documents, loadedDay)
                .then(preparedReceipts =>
                  models.receipts.upsertMany(preparedReceipts)
                )
                .then(() =>
                  Promise.each(dayDocs.documents, receipt => {
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
                .catch(err => {
                  console.error(err);
                  models.days
                    .deleteByUuid(loadedDay.uuid)
                    .then(() =>
                      Promise.reject(
                        new Error(
                          `Не удалось сохранить продажи для дня ${loadedDay.loaded_day}`
                        )
                      )
                    );
                })
            )
        );
      });
    })
    .catch(console.error);
};
