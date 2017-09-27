const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Positions extends Parent {
  constructor() {
    super();
    this.className = "Positions";
    this.queries.upsert = `insert into positions 
          (id, receipt_uuid, commodity_uuid, price, sum, quantity) 
        values 
          ($[id], $[receipt_uuid], $[commodity_uuid], $[price], $[sum], $[quantity]) 
        on conflict do nothing`;
  }
  static prepareRequestedItems(items, receipt) {
    return Promise.map(items, item =>
      Promise.resolve({
        id: item.id,
        receipt_uuid: receipt.uuid,
        commodity_uuid: item.commodityUuid,
        price: item.price,
        sum: item.sum,
        quantity: item.quantity
      })
    );
  }
};
