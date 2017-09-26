const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Sessions extends Parent {
  constructor() {
    super();
    this.className = "Sessions";
    this.queries.upsert = `insert into sessions 
          (uuid, loaded_day_uuid, session_uuid, device_uuid, employee_uuid, session_type, datetime) 
        values 
          ($[uuid], $[loaded_day_uuid], $[session_uuid], $[device_uuid], $[employee_uuid], $[session_type], $[datetime]) 
        on conflict (uuid) do nothing`;
  }
  static prepareRequestedSessions(items, loadedDay) {
    let sessionTypes = {
      OPEN_SESSION: "open",
      CLOSE_SESSION: "close"
    };
    return Promise.map(items, item =>
      Promise.resolve({
        uuid: item.uuid,
        loaded_day_uuid: loadedDay.uuid,
        session_uuid: item.sessionUUID,
        device_uuid: item.deviceUuid,
        employee_uuid: item.openUserUuid,
        session_type: sessionTypes[item.type],
        datetime: item.openDate
      })
    );
  }
};
