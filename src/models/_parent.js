const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Stores {
  constructor() {
    this.className = "Parent";
    this.queries = {};
  }

  upsertMany(items) {
    if (!this.queries.upsertMany)
      return Promise.reject(
        `Не имплементирован SQL-запрос upsertMany для класса ${this.className}`
      );
    return db.tx(transaction =>
      Promise.map(items, item =>
        transaction.none(this.queries.upsertMany, item)
      ).then(queries => transaction.batch(queries))
    );
  }
};
