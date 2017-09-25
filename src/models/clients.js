const Parent = require("./_parent");
const db = require("../db");

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

  clearRelations(clientId) {
    if (!clientId)
      return Promise.reject(
        new Error(
          `Для удаления зависимостей модели Clients нужно обязательно передать clientId`
        )
      );
    return Promise.all([
      db.oneOrNone(`delete from stores where client_id=$1`, clientId),
      db.oneOrNone(`delete from employees where client_id=$1`, clientId)
    ]);
  }
};
