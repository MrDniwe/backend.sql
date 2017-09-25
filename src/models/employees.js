const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");
const Parent = require("./_parent");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Employees";
    this.queries.upsertMany = `insert into employees 
          (uuid, client_id, first_name, middle_name, last_name, phone) 
        values 
          ($[uuid], $[client_id], $[first_name], $[middle_name], $[last_name], $[phone]) 
        on conflict (uuid) do update
          set first_name=$[first_name], 
          middle_name=$[middle_name], 
          last_name=$[last_name], 
          phone=$[phone], 
          updated=current_timestamp`;
  }
};
