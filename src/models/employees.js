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
  employeesPaginatedListWithRevenueAndReceipts(
    clientId,
    from,
    to,
    limit,
    offset
  ) {
    limit = _.toInteger(limit) || 10;
    offset = _.toInteger(offset) || 0;
    let query = `select employee_uuid as uuid, first_name, middle_name, last_name, count as receipts, sum as revenue from
      (select employee_uuid, count(*), sum(sum) 
      from receipts 
      where 
       store_uuid in (select uuid from stores where client_id=$1)
       and datetime between $2 and $3
      group by employee_uuid 
      order by sum desc 
      limit $4 offset $5) as receipts inner join (select * from employees) as employees 
      on employees.uuid=receipts.employee_uuid 
      order by revenue desc;`;
    return db
      .manyOrNone(query, [clientId, from, to, limit, offset])
      .then(itemsList =>
        Promise.resolve(
          _.map(itemsList, item => {
            item.receipts = _.toInteger(item.receipts);
            item.revenue = _.toInteger(item.revenue);
            return item;
          })
        )
      );
  }
  employeesPaginatedListWithRevenueAndReceiptsAndDelta(
    clientId,
    previous,
    from,
    to,
    limit,
    offset
  ) {
    return Promise.all([
      this.employeesPaginatedListWithRevenueAndReceipts(
        clientId,
        previous,
        from,
        100000,
        0
      ),
      this.employeesPaginatedListWithRevenueAndReceipts(
        clientId,
        from,
        to,
        limit,
        offset
      )
    ]).spread((previous, current) =>
      Promise.resolve(
        _.map(current, item => {
          let matches = _.find(previous, elem => elem.uuid === item.uuid);
          item.revenue_delta = helpers.delta(
            item.revenue,
            matches && matches.revenue
          );
          item.receipts_delta = helpers.delta(
            item.receipts,
            matches && matches.receipts
          );
        })
      )
    );
  }
};
