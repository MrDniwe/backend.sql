const Parent = require("./_parent");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Clients";
    this.queries.upsert = `insert into clients 
          (id, token) 
        values 
          ($[id], $[token]) 
        on conflict (id) do update
          set token=$[token], 
          updated=current_timestamp`;
    this.queries.getById = `select * from clients where id=$1;`;
  }
};
