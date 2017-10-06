const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const _ = require("lodash");
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
      return Promise.all([
        models.sessions.averageData(
          req.payload.id,
          previous,
          req.payload.from,
          req.payload.to
        ),
        models.sessions.listStatistics(
          req.payload.id,
          req.payload.from,
          req.payload.to
        )
      ])
        .spread((basic, statList) =>
          Promise.resolve({
            basic,
            best:
              (statList &&
                _.isArray(statList) &&
                statList.length &&
                statList[0]) ||
              null,
            worst:
              (statList &&
                _.isArray(statList) &&
                statList.length &&
                statList[statList.length - 1]) ||
              null
          })
        )
        .catch(err => {
          console.error(err);
          return Promise.reject(err);
        });
    });
};
