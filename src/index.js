const cote = require("./cote");
const Promise = require("bluebird");
const _ = require("lodash");
const moment = require("moment");

const Clients = require("./models/clients");
const Stores = require("./models/stores");
const Employees = require("./models/employees");
const Devices = require("./models/devices");
const Commodities = require("./models/commodities");
const Sessions = require("./models/sessions");
const Days = require("./models/days");
const StoreEmployees = require("./models/store_employees");
const constraints = require("./constraints");

const clientsModel = new Clients();
const storesModel = new Stores();
const employeesModel = new Employees();
const storeEmployeesModel = new StoreEmployees();
const devicesModel = new Devices();
const commoditiesModel = new Commodities();
const sessionsModel = new Sessions();
const daysModel = new Days();

cote.dbResponder.on("clearClientsRelations", req => {
  Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ]).then(() => clientsModel.clearRelations(req.payload.id));
});

cote.dbResponder.on("upsertClient", req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req),
    constraints.tokenPresents(req)
  ])
    .then(() => {
      req.payload.id = _.trim(req.payload.id);
      req.payload.token = _.trim(req.payload.token);
    })
    .then(() => clientsModel.upsertOne(req.payload))
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
        Stores.prepareRequestedStores(stores, client),
        Employees.prepareRequestedEmployees(employees, client)
      ])
    )
    .spread((client, stores, employees) => {
      let storeEmployees = _.flatten(_.map(employees, "storeEmployees"));
      return Promise.all([
        Promise.resolve(client),
        storesModel.upsertMany(stores),
        employeesModel.upsertMany(employees)
      ])
        .then(() => storeEmployeesModel.upsertMany(storeEmployees))
        .then(() => Promise.resolve(client));
    })
    .then(client =>
      Promise.all([
        Promise.resolve(client),
        cote.remoteRequester.send({
          type: "getDevices",
          token: client.token
        }),
        Stores.getClientStores(client.id).then(stores =>
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
    .catch(console.error);
});

cote.dbResponder.on("loadSessions", req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req),
    constraints.tokenPresents(req)
  ])
    .then(() => {
      // реквестируем из БД магазины клиента
      return Stores.getClientStores(req.payload.id);
    })
    .then(stores => {
      //с недостающими делаем удаленный запрос, в случае ошибки не крошимся
      return Promise.map(stores, store => {
        let preparedPayload = _.map(req.payload.days, day =>
          moment(day).format("YYYY-MM-DD")
        );
        return daysModel
          .onlyLoadedDays(store.uuid, "session", preparedPayload)
          .then(allreadyLoaded =>
            _.map(allreadyLoaded, day => moment(day).utc().format("YYYY-MM-DD"))
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
          daysModel
            .upsertOne({
              store_uuid: storeDaysDocs.storeUuid,
              loaded_day: moment(dayDocs.day).utc().format("YYYY-MM-DD"),
              document_type: "session"
            })
            .then(loadedDay =>
              Sessions.prepareRequestedSessions(dayDocs.documents, loadedDay)
                .then(preparedSessions =>
                  sessionsModel.upsertMany(preparedSessions)
                )
                .catch(err => {
                  console.error(err);
                  daysModel
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
});
