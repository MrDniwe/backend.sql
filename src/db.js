"use strict";
const config = require("./config");
const Promise = require("bluebird");
const initialOptions = {
  promiseLib: Promise
};
const pgp = require("pg-promise")(initialOptions);

const db = pgp(config.postgres);

module.exports = db;
