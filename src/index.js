const cote = require("./cote");
const db = require("./db");
const r = require("rethinkdb");
const Promise = require("bluebird");

const app = {};

db(app).then(() => Promise.all([])).then(() => {
  cote.on("saveSells", req => {
    return Promise.resolve();
  });
});
