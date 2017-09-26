const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Employees";
    this.queries.upsert = `insert into employees 
          (uuid, client_id, first_name, middle_name, last_name, phone) 
        values 
          ($[uuid], $[client_id], $[first_name], $[middle_name], $[last_name], $[phone]) 
        on conflict (uuid) do update
          set first_name=$[first_name], 
          middle_name=$[middle_name], 
          last_name=$[last_name], 
          phone=$[phone], 
          updated=current_timestamp`;
  }
  static prepareRequestedEmployees(employees, client) {
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
};
