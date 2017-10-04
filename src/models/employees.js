const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");

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
};
