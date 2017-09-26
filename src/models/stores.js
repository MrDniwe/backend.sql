const Parent = require("./_parent");
const db = require("../db");
const Promise = require("bluebird");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Stores";
    this.queries.upsert = `insert into stores
          (uuid, client_id, title, address) 
        values 
          ($[uuid], $[client_id], $[title], $[address]) 
        on conflict (uuid) do update
          set title=$[title], 
          address=$[address], 
          updated=current_timestamp`;
  }
  static getClientStores(clientId) {
    return db.many("select * from stores where client_id=$1", clientId);
  }
  static prepareRequestedStores(stores, client) {
    return Promise.map(stores, store => ({
      uuid: store.uuid,
      client_id: client.id,
      title: store.name,
      address: store.address
    }));
  }
};
