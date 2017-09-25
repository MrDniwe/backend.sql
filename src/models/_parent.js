const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Stores {
  constructor() {
    this.className = "Parent";
    this.queries = {};
  }

  upsertMany(items) {
    if (!this.queries.upsert)
      return Promise.reject(
        `Не имплементирован SQL-запрос upsert для класса ${this.className}`
      );
    return db.tx(transaction =>
      Promise.map(items, item =>
        transaction.none(this.queries.upsert, item)
      ).then(queries => transaction.batch(queries))
    );
  }

  upsertOne(item) {
    if (!this.queries.upsert)
      return Promise.reject(
        `Не имплементирован SQL-запрос upsert для класса ${this.className}`
      );
    return db.none(this.queries.upsert, item).then(() => this.getById(item.id));
  }

  getById(id) {
    if (!this.queries.upsert)
      return Promise.reject(
        `Не имплементирован SQL-запрос getById для класса ${this.className}`
      );
    return db.one(this.queries.getById, id);
  }
};
