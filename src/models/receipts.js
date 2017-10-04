const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");
const moment = require("moment");
const R = require("ramda");
const constraints = require("../constraints");
const Stores = require("./stores");
const helpers = require("../libs/helpers");

module.exports = class Receipts extends Parent {
  constructor() {
    super();
    this.className = "Receipts";
    this.queries.upsert = `insert into receipts 
          (uuid, session_uuid, loaded_day_uuid, device_uuid, employee_uuid, store_uuid, datetime, sum) 
        values 
          ($[uuid], $[session_uuid], $[loaded_day_uuid], $[device_uuid], $[employee_uuid], $[store_uuid], $[datetime], $[sum]) 
        on conflict (uuid) do nothing`;
  }

  prepareRequestedItems(items, loadedDay) {
    return Promise.map(items, item =>
      this.prepareRequestedItem(item, loadedDay)
    );
  }

  prepareRequestedItem(item, loadedDay) {
    return Promise.resolve({
      uuid: item.uuid,
      session_uuid: item.sessionUUID,
      loaded_day_uuid: loadedDay.uuid,
      device_uuid: item.deviceUuid,
      employee_uuid: item.openUserUuid,
      store_uuid: item.storeUuid,
      datetime: item.openDate,
      sum: item.closeResultSum
    });
  }

  receiptsAvgAndQuantityByStores(clientId, dateFrom, dateTo) {
    if (!dateTo) dateTo = moment();
    if (!dateFrom || !moment(dateFrom).isValid())
      return Promise.reject(
        new Error(
          "Не валидная начальная дата в методе получения чеков по магазинам"
        )
      );
    if (!clientId)
      return Promise.reject(
        new Error("Отсутсвует ID клиента в методе получения чеков по магазинам")
      );
    return db
      .manyOrNone(
        `select 
          store_uuid, title, count(*) as receipts, 
          avg(sum)::numeric(10,2) as middle_receipt
      from receipts inner join stores on receipts.store_uuid = stores.uuid
      where 
        datetime between $[from] and $[to] 
        and store_uuid in (select uuid from stores where client_id=$[clientId]) 
      group by store_uuid, title;`,
        {
          from: moment(dateFrom).toISOString(),
          to: moment(dateTo).toISOString(),
          clientId: clientId
        }
      )
      .catch(err => {
        console.error(err);
        return Promise.reject(err);
      });
  }

  receiptsAvgAndQuantityByDaysOfWeek(clientId, dateFrom, dateTo) {
    if (!dateTo) dateTo = moment();
    if (!dateFrom || !moment(dateFrom).isValid())
      return Promise.reject(
        new Error(
          "Не валидная начальная дата в методе получения чеков по магазинам"
        )
      );
    if (!clientId)
      return Promise.reject(
        new Error("Отсутсвует ID клиента в методе получения чеков по магазинам")
      );
    return db.manyOrNone(
      `select 
        date_part('isodow', datetime), count(*) as receipts, 
        avg(sum)::numeric(10,2) as middle_receipt
      from receipts
      where 
        datetime between $[from] and $[to] 
        and store_uuid in (select uuid from stores where client_id=$[clientId]) 
      group by date_part('isodow', datetime);`,
      {
        from: moment(dateFrom).toISOString(),
        to: moment(dateTo).toISOString(),
        clientId: clientId
      }
    );
  }
  receiptsAvgAndQuantityTotal(clientId, dateFrom, dateTo) {
    if (!dateTo) dateTo = moment();
    if (!dateFrom || !moment(dateFrom).isValid())
      return Promise.reject(
        new Error(
          "Не валидная начальная дата в методе получения чеков по магазинам"
        )
      );
    if (!clientId)
      return Promise.reject(
        new Error("Отсутсвует ID клиента в методе получения чеков по магазинам")
      );
    return db
      .oneOrNone(
        `select 
        count(*) as receipts, 
        avg(sum)::numeric(10,2) as middle_receipt
      from receipts
      where 
        datetime between $[from] and $[to] 
        and store_uuid in (select uuid from stores where client_id=$[clientId])`,
        {
          from: moment(dateFrom).toISOString(),
          to: moment(dateTo).toISOString(),
          clientId: clientId
        }
      )
      .catch(err => {
        console.error(err);
        return Promise.reject(err);
      });
  }

  static topNum(num) {
    let base = Math.floor(Math.log10(num)) - 1;
    return Math.ceil(num / Math.pow(10, base)) * Math.pow(10, base);
  }

  static createDiapasonArr(rangesCount = 1, max) {
    let partSize = Receipts.topNum(max) / rangesCount;
    let partArr = R.map(R.multiply(partSize), R.range(1, rangesCount));
    let roundedArr = R.map(Receipts.topNum, partArr);
    let mapIndexed = R.addIndex(R.map);
    let untop = mapIndexed((item, index, list) => {
      return {
        label: `${index > 0 ? list[index - 1] : 0}-\n${item}`,
        bottom: index > 0 ? list[index - 1] : 0,
        top: item
      };
    }, roundedArr);
    untop.push({
      label: `${untop[untop.length - 1].top}-\n${Receipts.topNum(max)}`,
      bottom: untop[untop.length - 1].top,
      top: Receipts.topNum(max)
    });
    return untop;
  }

  maxReceiptSum(clientId, dateFrom, dateTo) {
    return constraints
      .clientFromTo(clientId, dateFrom, dateTo)
      .spread((clientId, dateFrom, dateTo) =>
        db.one(
          `select 
          max(sum)::numeric(10,2)
        from receipts
        where 
          datetime between $[from] and $[to] 
          and store_uuid in (select uuid from stores where client_id=$[clientId])`,
          {
            from: moment(dateFrom).toISOString(),
            to: moment(dateTo).toISOString(),
            clientId: clientId
          }
        )
      )
      .catch(console.error);
  }

  receiptsByPriceDiapasons(clientId, dateFrom, dateTo) {
    return constraints
      .clientFromTo(clientId, dateFrom, dateTo)
      .spread((clientId, dateFrom, dateTo) =>
        this.maxReceiptSum(clientId, dateFrom, dateTo)
          .then(receipt => Promise.resolve(receipt.max))
          .then(max => {
            let diapasonArray = Receipts.createDiapasonArr(7, max);
            return Promise.map(diapasonArray, diapason =>
              this.receiptDiapasonCount(
                clientId,
                dateFrom,
                dateTo,
                diapason.bottom,
                diapason.top
              ).then(result => {
                diapason.quantity = result.receipts;
                return Promise.resolve(diapason);
              })
            ).catch(console.error);
          })
      );
  }

  receiptDiapasonCount(clientId, dateFrom, dateTo, bottom = 0, top = 1000) {
    return constraints
      .clientFromTo(clientId, dateFrom, dateTo)
      .spread((clientId, dateFrom, dateTo) =>
        db
          .one(
            `select 
            count(*) as receipts
          from receipts
          where 
            datetime between $[from] and $[to] 
              and sum between $[bottom] and $[top]
            and store_uuid in (select uuid from stores where client_id=$[clientId])`,
            {
              from: moment(dateFrom).toISOString(),
              to: moment(dateTo).toISOString(),
              clientId: clientId,
              bottom: bottom,
              top: top
            }
          )
          .catch(console.error)
      );
  }

  receiptsAvgAndQuantityTotalByGivenStores(dateFrom, dateTo, storesList) {
    return db
      .oneOrNone(
        `select 
        count(*) as receipts, 
        avg(sum)::numeric(10,2) as middle_receipt
      from receipts
      where 
        datetime between $1 and $2 
        and store_uuid in ($3:csv)`,
        [
          moment(dateFrom).toISOString(),
          moment(dateTo).toISOString(),
          storesList
        ]
      )
      .catch(err => {
        console.error(err);
        return Promise.reject(err);
      });
  }

  receiptsSummaryWithDeltaAndStore(datePrevious, dateFrom, dateTo, storeUuids) {
    return Promise.all([
      this.receiptsAvgAndQuantityTotalByGivenStores(
        dateFrom,
        dateTo,
        storeUuids
      ),
      this.receiptsAvgAndQuantityTotalByGivenStores(
        datePrevious,
        dateFrom,
        storeUuids
      )
    ])
      .spread((currentPeriod, previousPeriod) =>
        Promise.resolve({
          receipts: _.toInteger(currentPeriod.receipts),
          receipts_delta: _.round(
            helpers.delta(
              _.toInteger(currentPeriod.receipts),
              _.toInteger(previousPeriod.receipts)
            ),
            3
          ),
          middle_receipt: _.toInteger(currentPeriod.middle_receipt),
          middle_receipt_delta: _.round(
            helpers.delta(
              _.toInteger(currentPeriod.middle_receipt),
              _.toInteger(previousPeriod.middle_receipt)
            ),
            3
          )
        })
      )
      .catch(console.error);
  }

  receiptsByTimeDiapasonAndGivenStores(dateFrom, dateTo, storesList) {
    return db.oneOrNone(
      `select sum(sum), count(*) from receipts where 
        datetime between $1 and $2 
        and store_uuid in ($3:csv);`,
      [dateFrom, dateTo, storesList]
    );
  }
  receiptsByTimeDiapasonListAndGivenStores(diapasonList, storesList) {
    let diapasonArray = [];
    _.forEach(diapasonList, (value, key) => {
      diapasonArray.push(_.extend(value, { label: key }));
    });
    return Promise.map(diapasonArray, diapason =>
      this.receiptsByTimeDiapasonAndGivenStores(
        diapason.fromTime,
        diapason.toTime,
        storesList
      ).then(result =>
        Promise.resolve({
          label: diapason.label,
          quantity: _.toInteger(result.count),
          sum: _.toInteger(result.sum)
        })
      )
    );
  }
};
