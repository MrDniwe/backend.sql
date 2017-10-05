const Parent = require("./_parent");
const Promise = require("bluebird");
const _ = require("lodash");
const db = require("../db");

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
  prepareRequestedItems(items, receipt) {
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
  topSalesByStoreWithDelta(storeUuid, previous, from, to, limit, offset) {
    limit = _.toInteger(limit) || 10;
    offset = _.toInteger(offset) || 0;
    const query = `
      select
        title,
        revenue,
          revenue_delta,
          quantity,
          quantity_delta
      from
          (select
              commodity_uuid,
              revenue_sum as revenue,
              ((revenue_sum - prev_revenue_sum)::numeric(12,2)/nullif(prev_revenue_sum::numeric(12,2),0))::numeric(12,3) as revenue_delta,
              quantity,
              ((quantity - prev_quantity)::numeric(12,2)/nullif(prev_quantity::numeric(12,2),0))::numeric(12,3) as quantity_delta
          from
                  (select 
                      commodity_uuid, 
                      sum(sum)::bigint as revenue_sum, 
                      sum(quantity)::numeric(10,2) as quantity 
                  from positions 
                  where 
                      receipt_uuid in
                          (select uuid 
                           from receipts 
                           where 
                              datetime between $[from] and $[to]
                              and store_uuid=$[storeUuid]
                          )
                  group by commodity_uuid
                  order by revenue_sum desc
                  limit $[limit]
                  offset $[offset]) as sells
              left join
                  (select 
                      commodity_uuid as prev_com_uuid, 
                      sum(sum)::bigint as prev_revenue_sum, 
                      sum(quantity)::numeric(10,2) as prev_quantity 
                  from positions 
                  where 
                      receipt_uuid in
                          (select uuid 
                           from receipts 
                           where 
                              datetime between $[previous] and $[from]
                              and store_uuid=$[storeUuid]
                          )
                  group by commodity_uuid) as prev_sells
              on prev_sells.prev_com_uuid=sells.commodity_uuid) as whole_sales
          inner join commodities
          on commodities.uuid=whole_sales.commodity_uuid
      order by revenue desc
    `;
    return db
      .manyOrNone(query, { storeUuid, previous, from, to, limit, offset })
      .then(resultList =>
        Promise.resolve(
          _.map(resultList, item => {
            item.revenue = _.toInteger(item.revenue);
            item.revenue_delta = _.toNumber(item.revenue_delta);
            item.quantity = _.toNumber(item.quantity);
            item.quantity_delta = _.toNumber(item.quantity_delta);
            return item;
          })
        )
      );
  }
  topSalesForEachClientsStore(clientId, previous, from, to, limit, offset) {
    const query = `select uuid, title from stores where client_id=$[clientId]`;
    return db.manyOrNone(query, { clientId }).then(stores =>
      Promise.map(stores, store =>
        this.topSalesByStoreWithDelta(
          store.uuid,
          previous,
          from,
          to,
          limit,
          offset
        ).then(sales => {
          store.sales = sales;
          return Promise.resolve(store);
        })
      )
    );
  }
};
