const cote = require("./cote");
const db = require("./db");
const Promise = require("bluebird");
const _ = require("lodash");

const app = {};

cote.on("upsertClient", req => {
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
      .then(resolve)
      .catch(console.error)
      .catch(reject);
  });
});
