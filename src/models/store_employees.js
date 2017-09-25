const Parent = require("./_parent");

module.exports = class StoreEmployees extends Parent {
  constructor() {
    super();
    this.className = "StoreEmployees";
    this.queries.upsert = `insert into store_employees 
          (store_uuid, employee_uuid) 
        values 
          ($[store_uuid], $[employee_uuid]) 
        on conflict do nothing`;
  }
};
