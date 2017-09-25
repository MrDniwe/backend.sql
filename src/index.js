const cote = require("./cote");
const db = require("./db");
const Promise = require("bluebird");
const _ = require("lodash");

const Stores = require("./models/stores");
const Employees = require("./models/employees");
const StoreEmployees = require("./models/store_employees");

const storesModel = new Stores();
const employeesModel = new Employees();
const storeEmployeesModel = new StoreEmployees();

cote.dbResponder.on("upsertClient", req => {
  return new Promise((resolve, reject) => {
    if (!req.payload) return reject("Отсутствуют данные клиента");
    if (!req.payload.id) return reject("Отсутствует ID клиента");
    if (!req.payload.token) return reject("Отсутствует app token клиента");
    req.payload.id = _.trim(req.payload.id);
    req.payload.token = _.trim(req.payload.token);
    //TODO этот кусок кода нужно переписать в формате on conflict do update
    db
      .oneOrNone("select * from clients where id=${id};", req.payload)
      .then(foundClient => {
        if (!foundClient || _.isEmpty(foundClient)) {
          return db
            .none(
              "insert into clients (id, token) values (${id}, ${token});",
              req.payload
            )
            .then(() =>
              db.one("select * from clients where id=${id};", req.payload)
            );
        } else {
          if (foundClient.token !== req.payload.token)
            return db
              .none(
                "update clients set token=${token}, updated = current_timestamp where id=${id}",
                req.payload
              )
              .then(() =>
                db.one("select * from clients where id=${id};", req.payload)
              );
          else return Promise.resolve(foundClient);
        }
      })
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
      .catch(console.error)
      .then(resolve)
      .catch(reject);
    // .spread(client =>
    //   db
    //     .many("select * from stores where client_id=$[id]", client)
    //     .then(stores =>
    //       Promise.each(store, store =>
    //         Promise.all([
    //           cote.remoteRequester.send({
    //             type: "getCommodities",
    //             token: client.token,
    //             store: store.uuid
    //           }),
    //           cote.remoteRequester.send({
    //             type: "getDevices",
    //             token: client.token,
    //             store: store.uuid
    //           })
    //         ])
    //       )
    //     )
    // )
  });
});
