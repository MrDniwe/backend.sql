const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");

module.exports = (token, storeUuid, date) => {
  return models.schedule
    .markItemAsPending(moment(date).format("YYYY-MM-DD"), storeUuid, "session")
    .then(() =>
      cote.remoteRequester.send({
        type: "getSessionsByDay",
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
            document_type: "session"
          })
          .then(loadedDay =>
            models.sessions
              .prepareRequestedSessions(loadResult.documents, loadedDay)
              .then(preparedSessions =>
                models.sessions.upsertMany(preparedSessions)
              )
              .catch(err => {
                console.error(err);
                return models.days
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
          .then(() =>
            models.schedule.removeRowFromSchedule(
              moment(date).format("YYYY-MM-DD"),
              storeUuid,
              "session"
            )
          );
      } else {
        return models.schedule.removeRowFromSchedule(
          moment(date).format("YYYY-MM-DD"),
          storeUuid,
          "session"
        );
        //TODO логируем ошибку загрузки данных
      }
    })
    .catch(console.error);
};
