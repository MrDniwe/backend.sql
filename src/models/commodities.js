const Parent = require("./_parent");

module.exports = class Commodities extends Parent {
  constructor() {
    super();
    this.className = "Commodities";
    this.queries.upsert = `insert into commodities 
          (uuid, store_uuid, title, description, cost, price) 
        values 
          ($[uuid], $[store_uuid], $[title], $[description], $[cost], $[price]) 
        on conflict (uuid) do nothing`;
  }
};
