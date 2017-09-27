const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");

module.exports = req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ]).then(() => models.clients.clearRelations(req.payload.id));
};
