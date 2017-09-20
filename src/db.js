"use strict";
const config = require("./config");
const r = require("rethinkdb");
const R = require("ramda");
const Promise = require("bluebird");
let conn;

module.exports = app => {
  return r
    .connect(config.rethink)
    .then(connection => (conn = connection))
    .then(() => r.dbList().run(conn))
    .then(databases => {
      if (!R.contains(config.rethink.db, databases)) {
        r
          .dbCreate(config.rethink.db)
          .run(conn)
          .then(() => {
            conn.use(config.rethink.db);
            app.conn = conn;
            return Promise.resolve();
          })
          .catch(Promise.reject);
      } else {
        app.conn = conn;
        return Promise.resolve();
      }
    });
};
