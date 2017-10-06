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
    item.is_temporary =
      moment().utc().format("YYYY-MM-DD") ===
      moment(item.loaded_day).format("YYYY-MM-DD");
    return db
      .none(this.queries.upsert, item)
      .then(() =>
        db.one(
          "select * from loaded_days where store_uuid=$[store_uuid] and loaded_day=$[loaded_day] and document_type=$[document_type]",
          item
        )
      );
  }

  onlyLoadedDays(storeUuid, documentType, daysArr) {
    if (!(storeUuid && documentType))
      return Promise.reject(
        "Не заданы тип документа или storeUuid для кешированных дней"
      );
    if (!(daysArr && _.isArray(daysArr) && daysArr.length))
      return Promise.resolve([]);
    let params = {
      days: [daysArr],
      type: documentType,
      store: storeUuid
    };
    return db
      .manyOrNone(
        `select loaded_day from loaded_days 
        where loaded_day in ($1:csv) and document_type=$2 and store_uuid=$3 and is_temporary=false`,
        [daysArr, documentType, storeUuid]
      )
      .then(result => _.map(result, "loaded_day"));
  }

  deleteByUuid(uuid) {
    if (!uuid)
      return Promise.reject(new Error(`Для удаления нужно указать uuid`));
    return db.oneOrNone(`delete from loaded_days where uuid=$1`, uuid);
  }
};
