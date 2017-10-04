const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");
const helpers = require("../libs/helpers");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Employees";
    this.queries.upsert = `insert into employees 
          (uuid, client_id, first_name, middle_name, last_name, phone) 
        values 
          ($[uuid], $[client_id], $[first_name], $[middle_name], $[last_name], $[phone]) 
        on conflict (uuid) do nothing`;
  }
  prepareRequestedEmployees(employees, client) {
    return Promise.map(employees, employee => {
      let employeePrepared = {
        uuid: employee.uuid,
        client_id: client.id,
        first_name: employee.name,
        middle_name: employee.patronymicName,
        last_name: employee.lastName,
        phone: employee.phone
      };
      employeePrepared.storeEmployees = _.map(employee.stores, store => ({
        store_uuid: store.storeUuid,
        employee_uuid: employee.uuid
      }));
      return Promise.resolve(employeePrepared);
    });
  }
  countTotalClientsEmployees(clientId) {
    return db
      .one(`select count(*) from employees where client_id=$1`, [clientId])
      .then(result => Promise.resolve(_.toInteger(result.count)));
  }
  paginatedListWithRevenueAndReceipts(
    clientId,
    previous,
    from,
    to,
    limit,
    offset
  ) {
    limit = _.toInteger(limit) || 10;
    offset = _.toInteger(offset) || 0;
    let query = `select 
        first_name,
        last_name,
        middle_name,
      current_receipts as receipts,
        ((current_receipts - previous_receipts)::numeric(12,2)/nullif(previous_receipts::numeric(12,2),0))::numeric(12,3) as receipts_delta,
        current_revenue as revenue,
        ((current_revenue - previous_revenue)::numeric(12,2)/nullif(previous_revenue::numeric(12,2),0))::numeric(12,3) as revenue_delta,
        current_avg_receipt as average_receipt,
        ((current_avg_receipt - previous_avg_receipt)::numeric(12,2)/nullif(previous_avg_receipt::numeric(12,2),0))::numeric(12,3) as avg_receipt_delta,
        sessions_count
      from
      (select * from
      ((select * from
      (select employee_uuid as cur_uuid, count(*) as current_receipts, sum(sum)::bigint as current_revenue, avg(sum)::bigint as current_avg_receipt
      from receipts 
      where 
       store_uuid in (select uuid from stores where client_id=$[clientId])
       and datetime between $[from] and $[to]
      group by employee_uuid 
      order by current_revenue desc 
      limit $[limit] offset $[offset]) as current_receipts
      left join
      (select employee_uuid as prev_uuid, count(*) as previous_receipts, sum(sum)::bigint as previous_revenue, avg(sum)::bigint as previous_avg_receipt
      from receipts 
      where 
       store_uuid in (select uuid from stores where client_id=$[clientId])
       and datetime between $[previous] and $[from]
      group by employee_uuid) as previous_receipts on current_receipts.cur_uuid = previous_receipts.prev_uuid) as full_data 
      inner join (select * from employees) as employees on employees.uuid=full_data.cur_uuid) as unified left join 
      (select employee_uuid as sess_employee_uuid, count(*) as sessions_count from sessions where session_type='open' 
      and datetime between $[from] and $[to]  
       group by employee_uuid) as sessions on sessions.sess_employee_uuid=unified.cur_uuid) as alltogether order by revenue desc
      `;
    return db
      .manyOrNone(query, {
        clientId,
        previous,
        from,
        to,
        limit,
        offset
      })
      .then(itemsList =>
        Promise.resolve(
          _.map(itemsList, item => {
            item.receipts = _.toInteger(item.receipts);
            item.revenue = _.toInteger(item.revenue);
            item.average_receipt = _.toInteger(item.average_receipt);
            item.receipts_delta = _.toNumber(item.receipts_delta);
            item.revenue_delta = _.toNumber(item.revenue_delta);
            item.avg_receipt_delta = _.toNumber(item.avg_receipt_delta);
            item.sessions_count = _.toNumber(item.sessions_count);
            return item;
          })
        )
      );
  }
  allClientsEmployeesByPeriodWithRevenue(clientId, from, to) {
    let query = `select first_name, middle_name, last_name, revenue from
(select employee_uuid, sum(sum)::bigint as revenue
    from receipts 
    where 
     store_uuid in (select uuid from stores where client_id=$[clientId])
     and datetime between $[from] and $[to]
    group by employee_uuid) as receipts inner join (select * from employees) as employees on employees.uuid=receipts.employee_uuid
    order by revenue desc;`;
    return db.manyOrNone(query, { clientId, from, to }).then(itemsList =>
      Promise.resolve(
        _.map(itemsList, item => {
          item.revenue = _.toInteger(item.revenue);
          return item;
        })
      )
    );
  }
};
