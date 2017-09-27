const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Receipts extends Parent {
  constructor() {
    super();
    this.className = "Receipts";
    this.queries.upsert = `insert into receipts 
          (uuid, session_uuid, loaded_day_uuid, device_uuid, employee_uuid, store_uuid, datetime, sum) 
        values 
          ($[uuid], $[session_uuid], $[loaded_day_uuid], $[device_uuid], $[employee_uuid], $[store_uuid], $[datetime], $[sum]) 
        on conflict (uuid) do nothing`;
  }
  prepareRequestedItems(items, loadedDay) {
    return Promise.map(items, item =>
      Promise.resolve({
        uuid: item.uuid,
        session_uuid: item.sessionUUID,
        loaded_day_uuid: loadedDay.uuid,
        device_uuid: item.deviceUuid,
        employee_uuid: item.openUserUuid,
        store_uuid: item.storeUuid,
        datetime: item.openDate,
        sum: item.closeResultSum
      })
    );
  }
};
