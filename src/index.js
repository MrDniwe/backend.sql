const cote = require("./cote");
const db = require("./db");
const Promise = require("bluebird");
const _ = require("lodash");

const app = {};

cote.dbResponder.on("upsertClient", req => {
  return new Promise((resolve, reject) => {
    if (!req.payload) return reject("Отсутствуют данные клиента");
    if (!req.payload.id) return reject("Отсутствует ID клиента");
    if (!req.payload.token) return reject("Отсутствует app token клиента");
    req.payload.id = _.trim(req.payload.id);
    req.payload.token = _.trim(req.payload.token);
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
        return Promise.all([
          db.tx(transaction =>
            Promise.map(stores, store =>
              transaction.none(
                `insert into stores 
                  (uuid, client_id, title, address) 
                values 
                  ($[uuid], $[client_id], $[title], $[address]) 
                on conflict (uuid) do update
                  set title=$[title], 
                  address=$[address], 
                  updated=current_timestamp`,
                store
              )
            ).then(queries => transaction.batch(queries))
          ),
          db.tx(transaction =>
            Promise.map(employees, employee =>
              transaction.none(
                `insert into employees 
                  (uuid, client_id, first_name, middle_name, last_name, phone) 
                values 
                  ($[uuid], $[client_id], $[first_name], $[middle_name], $[last_name], $[phone]) 
                on conflict (uuid) do update
                  set first_name=$[first_name], 
                  middle_name=$[middle_name], 
                  last_name=$[last_name], 
                  phone=$[phone], 
                  updated=current_timestamp`,
                employee
              )
            ).then(queries => transaction.batch(queries))
          ),
          db.tx(transaction => {
            let storeEmployees = _.flatten(_.map(employees, "storeEmployees"));
            return Promise.map(storeEmployees, storeEmployee =>
              transaction.none(
                `insert into store_employees 
                  (store_uuid, employee_uuid) 
                values 
                  ($[store_uuid], $[employee_uuid]) 
                on conflict do nothing`,
                storeEmployee
              )
            );
          })
        ]);
      })
      .then(resolve)
      .catch(reject);
  });
});
