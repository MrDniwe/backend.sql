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
          .onlyLoadedDays(store.uuid, "session", preparedPayload)
          .then(allreadyLoaded =>
            _.map(allreadyLoaded, day => moment(day).format("YYYY-MM-DD"))
          )
          .then(momented => _.difference(preparedPayload, momented))
          .then(daysToLoad =>
            cote.remoteRequester
              .send({
                type: "getSessionsByDays",
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
              document_type: "session"
            })
            .then(loadedDay =>
              models.sessions
                .prepareRequestedSessions(dayDocs.documents, loadedDay)
                .then(preparedSessions =>
                  models.sessions.upsertMany(preparedSessions)
                )
                .catch(err => {
                  models.days
                    .deleteByUuid(loadedDay.uuid)
                    .then(() =>
                      Promise.reject(
                        new Error(
                          `Не удалось сохранить сессии для дня ${loadedDay.loaded_day}`
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
