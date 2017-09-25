const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");
const Parent = require("./_parent");

module.exports = class StoreEmployees extends Parent {
  constructor() {
    super();
    this.className = "StoreEmployees";
    this.queries.upsertMany = `insert into store_employees 
          (store_uuid, employee_uuid) 
        values 
          ($[store_uuid], $[employee_uuid]) 
        on conflict do nothing`;
  }
};
