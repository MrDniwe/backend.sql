const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const helpers = require("../../libs/helpers");
const _ = require("lodash");

module.exports = req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ])
    .then(() =>
      constraints.clientFromTo(req.payload.id, req.payload.from, req.payload.to)
    )
    .then(() => {
      req.payload.quantityBars = _.toInteger(req.payload.quantityBars) || 7;
      return Promise.all([Promise.resolve("sales")]).spread(sales =>
        Promise.resolve({
          sales
        })
      );
    })
    .catch(err => {
      console.error(err);
      return Promise.reject(err);
    });
};
