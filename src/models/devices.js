const Parent = require("./_parent");

module.exports = class Devices extends Parent {
  constructor() {
    super();
    this.className = "Device";
    this.queries.upsert = `insert into devices 
          (uuid, store_uuid, title, timezone_offset) 
        values 
          ($[uuid], $[store_uuid], $[title], '$[timezone_offset] millisecond') 
        on conflict (uuid) do nothing`;
  }
};
