const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Payments extends Parent {
  constructor() {
    super();
    this.className = "Payments";
    this.queries.upsert = `insert into payments 
          (id, receipt_uuid, sum, payment_type) 
        values 
          ($[id], $[receipt_uuid], $[sum], $[payment_type]) 
        on conflict do nothing`;
  }
  prepareRequestedItems(items, receipt) {
    let types = {
      CASH: "cash",
      CARD: "card",
      CREDIT: "credit"
    };
    return Promise.map(items, item =>
      Promise.resolve({
        id: item.id,
        receipt_uuid: receipt.uuid,
        sum: item.sum,
        payment_type: types[item.paymentType] || "unknown"
      })
    );
  }
};
