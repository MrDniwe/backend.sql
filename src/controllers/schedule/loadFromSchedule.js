const models = require("../../models/_models");
const _ = require("lodash");
const Promise = require("bluebird");
const loadSellsByDay = require("../sells/loadSellsByDay");
const loadSessionsByDay = require("../sessions/loadSessionsByDay");

module.exports = () => {
  models.schedule
    .getRecordsToPending()
    .then(toPendList => {
      let grouped = _.groupBy(toPendList, "document_type");
      grouped.session = grouped.session || [];
      grouped.sell = grouped.sell || [];
      return Promise.all([
        Promise.map(grouped.sell, day =>
          loadSellsByDay(day.token, day.store_uuid, day.date)
        ),
        Promise.map(grouped.session, day =>
          loadSessionsByDay(day.token, day.store_uuid, day.date)
        )
      ]);
    })
    .catch(console.error);
};
