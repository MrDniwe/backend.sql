const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const Promise = require("bluebird");

module.exports = req => {
  // console.log("update called with: ", req);
  return (
    Promise.all([
      constraints.payloadPresents(req),
      constraints.clientIdPresents(req),
      constraints.tokenPresents(req)
    ])
      // .then(() => {
      //   req.payload.id = _.trim(req.payload.id);
      //   req.payload.token = _.trim(req.payload.token);
      // })
      .then(() => models.clients.upsertOne(req.payload))
      .then(client =>
        Promise.all([
          Promise.resolve(client),
          cote.remoteRequester.send({
            type: "getStores",
            token: client.token
          }),
          cote.remoteRequester.send({
            type: "getEmployees",
            token: client.token
          })
        ])
      )
      .spread((client, stores, employees) =>
        Promise.all([
          Promise.resolve(client),
          models.stores.prepareRequestedStores(stores, client),
          models.employees.prepareRequestedEmployees(employees, client)
        ])
      )
      .spread((client, stores, employees) => {
        let storeEmployees = _.flatten(_.map(employees, "storeEmployees"));
        return Promise.all([
          Promise.resolve(client),
          models.stores.upsertMany(stores),
          models.employees.upsertMany(employees)
        ])
          .then(() => models.storeEmployees.upsertMany(storeEmployees))
          .then(() => Promise.resolve(client));
      })
      .then(client =>
        Promise.all([
          Promise.resolve(client),
          cote.remoteRequester.send({
            type: "getDevices",
            token: client.token
          }),
          models.stores.getClientStores(client.id).then(stores =>
            Promise.map(stores, store =>
              cote.remoteRequester.send({
                type: "getStoreCommodities",
                token: client.token,
                storeUuid: store.uuid
              })
            )
          )
        ])
      )
      .spread((client, devices, storeCommodities) =>
        Promise.all([
          Promise.resolve(client),
          Promise.map(devices, device => ({
            uuid: device.uuid,
            store_uuid: device.storeUuid,
            title: device.name,
            timezone_offset: device.timezoneOffset
          })).then(devicesPrepared =>
            models.devices.upsertMany(devicesPrepared)
          ),
          Promise.each(storeCommodities, commodities =>
            Promise.map(commodities, commodity => ({
              uuid: commodity.uuid,
              store_uuid: commodity.storeUuid,
              title: commodity.name,
              description: commodity.description,
              cost: commodity.costPrice,
              price: commodity.price
            })).then(commoditiesPrepared =>
              models.commodities.upsertMany(commoditiesPrepared)
            )
          )
        ])
      )
      .catch(console.error)
  );
};
