const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");
const Profiler = require("../../libs/profiler");
const profilingEnabled = false;

module.exports = req => {
  let profiler = new Profiler(profilingEnabled, "loadSells");
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req),
    constraints.tokenPresents(req)
  ])
    .then(() => {
      profiler.check("реквестируем из БД магазины клиента");
      // реквестируем из БД магазины клиента
      return models.stores.getClientStores(req.payload.id);
    })
    .then(stores => {
      profiler.check(
        "с недостающими делаем удаленный запрос, в случае ошибки не крошимся"
      );
      return Promise.map(stores, store => {
        let profilerStore = new Profiler(profilingEnabled, store.uuid);
        profilerStore.check("Готовимся мануть даты");
        let preparedPayload = _.map(req.payload.days, day =>
          moment(day).format("YYYY-MM-DD")
        );
        profilerStore.check("Мапнули даты");
        return models.days
          .onlyLoadedDays(store.uuid, "sell", preparedPayload)
          .then(allreadyLoaded => {
            profilerStore.check("Получили ранее загруженные дни");
            return _.map(allreadyLoaded, day =>
              moment(day).format("YYYY-MM-DD")
            );
          })
          .then(momented => {
            profilerStore.check("Мапнули загруженные дни в моменты");
            return _.difference(preparedPayload, momented);
          })
          .then(daysToLoad => {
            profilerStore.check("Определили дни которые нам надо загрузить");
            return cote.remoteRequester
              .send({
                type: "getSellsByDays",
                token: req.payload.token,
                storeUuid: store.uuid,
                days: daysToLoad
              })
              .then(days => {
                profilerStore.check(
                  "Загрузили недостающие дни, отправляем результат"
                );
                return Promise.resolve({ storeUuid: store.uuid, days: days });
              });
          });
      });
    })
    .then(storesDaysDocs => {
      profiler.check("магазины с документами");
      return Promise.each(storesDaysDocs, storeDaysDocs => {
        // console.log(_.filter(storeDaysDocs.days, day => day.success));
        let onlySuccessesDays = _.filter(storeDaysDocs.days, "success");
        return Promise.map(onlySuccessesDays, dayDocs => {
          let profilerDays = new Profiler(
            profilingEnabled,
            `${storeDaysDocs.uuid}::${dayDocs.day}`
          );
          return models.days
            .upsertOne({
              store_uuid: storeDaysDocs.storeUuid,
              loaded_day: moment(dayDocs.day).utc().format("YYYY-MM-DD"),
              document_type: "sell"
            })
            .then(loadedDay => {
              profilerDays.check("day created");
              return models.receipts
                .prepareRequestedItems(dayDocs.documents, loadedDay)
                .then(preparedReceipts => {
                  profilerDays.check("receipts prepared");
                  return models.receipts.upsertMany(preparedReceipts);
                })
                .then(() => {
                  profilerDays.check("receipts upserted");
                  return Promise.each(dayDocs.documents, receipt => {
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
                  }).then(result => {
                    profilerDays.check("docs upserted");
                    return Promise.resolve(result);
                  });
                })
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
                });
            });
        });
      });
    })
    .then(result => {
      profiler.check("результат");
      return Promise.resolve(result);
    })
    .catch(console.error);
};
