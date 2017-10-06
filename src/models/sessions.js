const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");

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
  prepareRequestedSessions(items, loadedDay) {
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
  listStatistics(clientId, from, to) {
    let query = `
      select 
        first_name,
          middle_name,
          last_name,
          date,
          duration,
          revenue,
          receipts,
          average,
          store_title,
          store_address
      from
        (select 
            employee_uuid,
              date,
              duration,
              revenue,
              receipts,
              average,
              title as store_title,
              address as store_address
          from
              (select * 
              from
                  (select * 
                  from
                          (select
                              open_uuid as open_uuid,
                              device_uuid,
                              employee_uuid,
                              close_time - open_time as duration,
                              open_time as date
                          from
                                  (select 
                                      session_uuid as open_uuid,
                                      datetime as open_time,
                                      device_uuid,
                                      employee_uuid
                                  from sessions 
                                  where
                                    device_uuid in (select uuid from devices where store_uuid in 
                                      (select uuid from stores where client_id=$1))
                                      and datetime between $2 and $3
                                      and session_type='open')
                              as open_session
                              inner join
                                  (select 
                                      session_uuid as close_uuid, 
                                      datetime as close_time
                                  from sessions 
                                  where
                                    device_uuid in (select uuid from devices where store_uuid in 
                                    (select uuid from stores where client_id=$1))
                                      and datetime between $2 and $3
                                      and session_type='close')
                              as close_session
                              on open_session.open_uuid=close_session.close_uuid) 
                      as sessions_info
                      left join
                          (select 
                              sum(sum)::bigint as revenue, 
                              count(*)::integer as receipts, 
                              avg(sum)::integer as average,
      
                              session_uuid 
                           from receipts 
                           group by session_uuid) as sells
                      on sells.session_uuid=sessions_info.open_uuid) as sessions_table
              inner join
                  (select store_uuid, uuid as device_self_uuid from devices) as devices_table
              on devices_table.device_self_uuid=sessions_table.device_uuid) as sessions_with_stores
          inner join stores
          on stores.uuid = sessions_with_stores.store_uuid) as sessions_full
      inner join employees
      on employees.uuid=sessions_full.employee_uuid
      order by revenue desc
    `;
    return db.manyOrNone(query, [clientId, from, to]).then(resultList =>
      Promise.resolve(
        _.map(resultList, item => {
          item.revenue = _.toInteger(item.revenue);
          return item;
        })
      )
    );
  }
  averageData(clientId, previous, from, to) {
    const query = `
      select *
      from
        (select
                avg(close_time - open_time) as avg_duration
            from
                    (select 
                        session_uuid as open_uuid,
                        datetime as open_time,
                        device_uuid,
                        employee_uuid
                    from sessions 
                    where
                      device_uuid in (select uuid from devices where store_uuid in 
                        (select uuid from stores where client_id=$1))
                        and datetime between $3 and $4
                        and session_type='open')
                as open_session
                inner join
                    (select 
                        session_uuid as close_uuid, 
                        datetime as close_time
                    from sessions 
                    where
                      device_uuid in (select uuid from devices where store_uuid in 
                      (select uuid from stores where client_id=$1))
                        and datetime between $3 and $4
                        and session_type='close')
                as close_session
                on open_session.open_uuid=close_session.close_uuid)
      as avg_duration
      inner join
          (select 
              avg_revenue,
              ((avg_revenue - prev_avg_revenue)::numeric(12,2)/nullif(prev_avg_revenue::numeric(12,2),0))::numeric(12,3) as avg_revenue_delta,
              avg_receipts,
              ((avg_receipts - prev_avg_receipts)::numeric(12,2)/nullif(prev_avg_receipts::numeric(12,2),0))::numeric(12,3) as avg_receipts_delta
          from
              (select 
                  avg(sum)::integer as avg_revenue, avg(count)::integer as avg_receipts
              from 
              (select sum(sum), count(*) from receipts
              where session_uuid in
                  (select open_uuid
                  from
                      (select 
                        session_uuid as open_uuid
                      from sessions 
                      where
                          device_uuid in
                              (select uuid from devices 
                              where 
                              store_uuid in (select uuid from stores where client_id=$1))
                      and datetime between $3 and $4
                      and session_type='open') 
                  as open_sessions
                  inner join
                      (select 
                        session_uuid as close_uuid
                      from sessions 
                      where
                          device_uuid in
                              (select uuid from devices 
                              where 
                              store_uuid in (select uuid from stores where client_id=$1))
                      and datetime between $3 and $4
                      and session_type='close') 
                  as close_sessions
                  on open_sessions.open_uuid=close_sessions.close_uuid)
              group by session_uuid) as session_receipts) 
          as current
          inner join
              (select 
                  avg(sum)::integer as prev_avg_revenue, avg(count)::integer as prev_avg_receipts
              from 
              (select sum(sum), count(*) from receipts
              where session_uuid in
                  (select open_uuid
                  from
                      (select 
                        session_uuid as open_uuid
                      from sessions 
                      where
                          device_uuid in
                              (select uuid from devices 
                              where 
                              store_uuid in (select uuid from stores where client_id=$1))
                      and datetime between $2 and $3
                      and session_type='open') 
                  as open_sessions
                  inner join
                      (select 
                        session_uuid as close_uuid
                      from sessions 
                      where
                          device_uuid in
                              (select uuid from devices 
                              where 
                              store_uuid in (select uuid from stores where client_id=$1))
                      and datetime between $2 and $3
                      and session_type='close') 
                  as close_sessions
                  on open_sessions.open_uuid=close_sessions.close_uuid)
              group by session_uuid) as session_receipts)
          as previous
          on true)
      as avg_stat
      on true
      `;
    return db.oneOrNone(query, [clientId, previous, from, to]).then(result => {
      result.avg_revenue = _.toInteger(result.avg_revenue);
      result.avg_revenue_delta = _.toNumber(result.avg_revenue_delta);
      result.avg_receipts = _.toInteger(result.avg_receipts);
      result.avg_receipts_delta = _.toNumber(result.avg_receipts_delta);
      return Promise.resolve(result);
    });
  }
};
