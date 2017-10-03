const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");
const helpers = require("../libs/helpers");

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
  paymentsSumByTypesAndStores(dateFrom, dateTo, storeUuids) {
    return db.manyOrNone(
      `select payment_type, sum(sum) 
      from payments 
        where receipt_uuid in 
          (select uuid from receipts 
            where 
	            datetime between $1 and $2 
              and store_uuid in ($3:csv)) 
        group by payment_type;`,
      [dateFrom, dateTo, storeUuids]
    );
  }
  paymentsSumByTypesAndStoresWithDelta(
    datePrevious,
    dateFrom,
    dateTo,
    storeUuids
  ) {
    return Promise.all([
      this.paymentsSumByTypesAndStores(dateFrom, dateTo, storeUuids),
      this.paymentsSumByTypesAndStores(datePrevious, dateFrom, storeUuids)
    ]).spread((currentData, previousData) => {
      let curTotal = _.reduce(
        currentData,
        (sum, item) => sum + _.toInteger(item.sum),
        0
      );
      let prevTotal = _.reduce(
        previousData,
        (sum, item) => sum + _.toInteger(item.sum),
        0
      );
      currentData = _.keyBy(currentData, "payment_type");
      previousData = _.keyBy(previousData, "payment_type");
      let result = [];
      result.push({
        type: "total",
        value: curTotal,
        delta: _.round(helpers.delta(curTotal, prevTotal), 3)
      });
      _.forEach(currentData, (value, key) =>
        result.push({
          type: key,
          value: _.toInteger(value.sum),
          delta: _.round(
            helpers.delta(
              _.toInteger(value.sum),
              previousData[key] && _.toInteger(previousData[key].sum)
            ),
            3
          )
        })
      );
      return Promise.resolve(result);
    });
  }
};
