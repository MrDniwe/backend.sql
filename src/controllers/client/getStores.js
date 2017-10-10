const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");

module.exports = async req => {
  try {
    await Promise.all([
      constraints.payloadPresents(req),
      constraints.clientIdPresents(req)
    ]);
  } catch (err) {
    return Promise.reject(err);
  }
  try {
    let stores = await models.stores.getClientStores(req.payload.id);
    return stores;
  } catch (err) {
    return Promise.reject(err);
  }
};
