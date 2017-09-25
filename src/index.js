const cote = require("./cote");
const db = require("./db");
const Promise = require("bluebird");
const _ = require("lodash");

const Clients = require("./models/clients");
const Stores = require("./models/stores");
const Employees = require("./models/employees");
const Devices = require("./models/devices");
const Commodities = require("./models/commodities");
const StoreEmployees = require("./models/store_employees");

const clientsModel = new Clients();
const storesModel = new Stores();
const employeesModel = new Employees();
const storeEmployeesModel = new StoreEmployees();
const devicesModel = new Devices();
const commoditiesModel = new Commodities();

cote.dbResponder.on("upsertClient", req => {
  return new Promise((resolve, reject) => {
    if (!req.payload) return reject("Отсутствуют данные клиента");
    if (!req.payload.id) return reject("Отсутствует ID клиента");
    if (!req.payload.token) return reject("Отсутствует app token клиента");
    req.payload.id = _.trim(req.payload.id);
    req.payload.token = _.trim(req.payload.token);
    clientsModel
      .upsertOne(req.payload)
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
          Promise.map(stores, store => ({
            uuid: store.uuid,
            client_id: client.id,
            title: store.name,
            address: store.address
          })),
          Promise.map(employees, employee => {
            let employeePrepared = {
              uuid: employee.uuid,
              client_id: client.id,
              first_name: employee.name,
              middle_name: employee.patronymicName,
              last_name: employee.lastName,
              phone: employee.phone
            };
            employeePrepared.storeEmployees = _.map(employee.stores, store => ({
              store_uuid: store.storeUuid,
              employee_uuid: employee.uuid
            }));
            return Promise.resolve(employeePrepared);
          })
        ])
      )
      .spread((client, stores, employees) => {
        let storeEmployees = _.flatten(_.map(employees, "storeEmployees"));
        return Promise.all([
          Promise.resolve(client),
          storesModel.upsertMany(stores),
          employeesModel.upsertMany(employees),
          storeEmployeesModel.upsertMany(storeEmployees)
        ]);
      })
      .spread(client =>
        Promise.all([
          Promise.resolve(client),
          cote.remoteRequester.send({
            type: "getDevices",
            token: client.token
          }),
          storesModel.getClientStores(client.id).then(stores =>
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
          })).then(devicesPrepared => devicesModel.upsertMany(devicesPrepared)),
          Promise.each(storeCommodities, commodities =>
            Promise.map(commodities, commodity => ({
              uuid: commodity.uuid,
              store_uuid: commodity.storeUuid,
              title: commodity.name,
              description: commodity.description,
              cost: commodity.costPrice,
              price: commodity.price
            })).then(commoditiesPrepared =>
              commoditiesModel.upsertMany(commoditiesPrepared)
            )
          )
        ])
      )
      .catch(console.error)
      .then(resolve)
      .catch(reject);
  });
});
