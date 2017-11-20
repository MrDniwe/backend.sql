const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");
const moment = require("moment");
const constraints = require("../constraints");
const config = require("../config");

module.exports = class Schedule extends Parent {
  constructor() {
    super();
    this.className = "Schedule";
    this.queries.upsert = `insert into schedule
          (date, document_type, store_uuid) 
        values 
          ($[date], $[document_type], $[store_uuid]) 
        on conflict (uuid) do nothing`;
  }
  generateDaysList() {
    // let today = moment();
    return _.map(_.range(config.schedule.daysToLoad), day =>
      moment().subtract(day, "days").format("YYYY-MM-DD")
    );
  }
  createScheduleForDateSells(date) {
    return db.none(
      `insert into schedule 
        (date, document_type, store_uuid)
      select $[date] as date, 'sell' as document_type, uuid 
      from stores 
      where uuid not in (select store_uuid from loaded_days where loaded_day=$[date] and document_type='sell') 
      and uuid not in (select store_uuid from schedule where date=$[date] and document_type='sell')
      on conflict do nothing`,
      { date: date }
    );
  }
  createScheduleForDateSessions(date) {
    return db.none(
      `insert into schedule 
        (date, document_type, store_uuid)
      select $[date] as date, 'session' as document_type, uuid 
      from stores 
      where uuid not in (select store_uuid from loaded_days where loaded_day=$[date] and document_type='session') 
      and uuid not in (select store_uuid from schedule where date=$[date] and document_type='session')
      on conflict do nothing`,
      { date: date }
    );
  }
  createScheduleForTemporary() {
    return db.none(
      `insert into schedule 
        (date, document_type, store_uuid) 
      select 
        loaded_day as date, document_type, store_uuid 
      from loaded_days 
      where is_temporary=true and updated < (now() - interval $[interval])
      on conflict do nothing;`,
      { interval: config.schedule.temporaryReloadCycle }
    );
  }
  populateSchedule() {
    return Promise.each(this.generateDaysList(), day =>
      Promise.all([
        this.createScheduleForDateSells(day),
        this.createScheduleForDateSessions(day),
        this.createScheduleForTemporary(),
        this.setLongPendedToStill()
      ])
    ).catch(console.error);
  }
  getRecordsToPending() {
    return db.manyOrNone(
      `select date, document_type, store_uuid, token  
      from 
        (select date, document_type, store_uuid, client_id 
          from 
          (select date, document_type, store_uuid 
            from 
              (select * 
                from schedule 
                order by pending desc, date desc 
                limit $[simultaneous]) as last_ten 
            where pending=false) as schedules 
            inner join stores on stores.uuid = schedules.store_uuid) as schedule_stores 
        inner join clients on clients.id = schedule_stores.client_id`,
      { simultaneous: config.schedule.simultaneousOperations }
    );
  }
  setLongPendedToStill() {
    return db.none(
      `update schedule
      set pending=false, added=current_timestamp 
      where pending=true and added < (now() - interval $[pending])`,
      { pending: config.schedule.closePending }
    );
  }
  markItemAsPending(date, storeUuid, type) {
    if (!(date && moment(date).isValid() && storeUuid && type))
      return Promise.reject(
        new Error(
          'Недостаточно параметоров для отметки строки расписания как "в обработке"'
        )
      );
    return db.none(
      `update schedule
      set pending=true, added=current_timestamp
      where date=$1 and document_type=$2 and store_uuid=$3`,
      [date, type, storeUuid]
    );
  }
  removeRowFromSchedule(date, storeUuid, type) {
    if (!(date && moment(date).isValid() && storeUuid && type))
      return Promise.reject(
        new Error("Недостаточно параметоров для удаления строки из раписания")
      );
    return db.none(
      `delete from schedule
      where date=$1 and document_type=$2 and store_uuid=$3`,
      [date, type, storeUuid]
    );
  }
  async countLoadedDays(clientId, from, to, storeUuid) {
    if (!(moment(from).isValid() && moment(to).isValid() && clientId))
      return Promise.reject(
        new Error(
          "Недостаточно параметоров для подсчета количества загруженных дней"
        )
      );
    let stores;
    if (storeUuid) stores = [storeUuid];
    else {
      let strs = await db.many(
        "select * from stores where client_id=$1",
        clientId
      );
      stores = _.map(strs, "uuid");
    }
    const query = `
      select count(*) from 
        (select count(*) from loaded_days 
        where 
          store_uuid in ($1:csv) 
          and loaded_day between $2 and $3 
          group by loaded_day
        ) as days`;
    return await db.one(query, [stores, from, to]);
  }
};
