const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const uuidv4 = require("uuid/v4");
const db = require("../db");
const moment = require("moment");

module.exports = class Days extends Parent {
  constructor() {
    super();
    this.className = "Days";
    this.queries.upsert = `insert into loaded_days 
          (uuid, store_uuid, loaded_day, document_type, is_temporary) 
        values 
          ($[uuid], $[store_uuid], $[loaded_day], $[document_type], $[is_temporary]) 
        on conflict (store_uuid, loaded_day, document_type) do update
          set is_temporary=$[is_temporary], 
          updated=current_timestamp`;
    this.queries.getById = `select * from loaded_days where uuid=$1`;
  }
  upsertOne(item) {
    if (!this.queries.upsert)
      return Promise.reject(
        new Error(
          `Не имплементирован SQL-запрос upsert для класса ${this.className}`
        )
      );
    item.uuid = uuidv4();
    item.is_temporary = moment().utc().isSameOrBefore(item.loaded_day);
    return db
      .none(this.queries.upsert, item)
      .then(() =>
        db.one(
          "select * from loaded_days where store_uuid=$[store_uuid] and loaded_day=$[loaded_day] and document_type=$[document_type]",
          item
        )
      );
  }

  deleteByUuid(uuid) {
    if (!uuid)
      return Promise.reject(new Error(`Для удаления нужно указать uuid`));
    return db.oneOrNone(`delete from loaded_days where uuid=$1`, uuid);
  }
};
