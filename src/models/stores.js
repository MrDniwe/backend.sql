const Parent = require("./_parent");
const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Stores";
    this.queries.upsert = `insert into stores
          (uuid, client_id, title, address) 
        values 
          ($[uuid], $[client_id], $[title], $[address]) 
        on conflict (uuid) do nothing`;
  }
  getClientStores(clientId) {
    return db.manyOrNone("select * from stores where client_id=$1", clientId);
  }
  prepareRequestedStores(stores, client) {
    return Promise.map(stores, store => ({
      uuid: store.uuid,
      client_id: client.id,
      title: store.name,
      address: store.address
    }));
  }
  exactOrAllStores(clientId, storeUuid) {
    return db
      .manyOrNone("select * from stores where client_id=$1", clientId)
      .then(stores => {
        stores = _.map(stores, "uuid");
        if (storeUuid) {
          stores = _.intersection(stores, [storeUuid]);
        }
        if (!stores.length)
          return Promise.reject(new Error("Нет магазинов по вашему запросу"));
        return Promise.resolve(stores);
      });
  }
};
