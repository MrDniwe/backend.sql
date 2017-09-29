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
        this.createScheduleForTemporary()
      ])
    );
  }
};
