const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");
const Parent = require("./_parent");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Stores";
    this.queries.upsertMany = `insert into stores 
          (uuid, client_id, title, address) 
        values 
          ($[uuid], $[client_id], $[title], $[address]) 
        on conflict (uuid) do update
          set title=$[title], 
          address=$[address], 
          updated=current_timestamp`;
  }
};
