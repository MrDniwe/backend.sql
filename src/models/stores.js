const Parent = require("./_parent");
const db = require("../db");
const Promise = require("bluebird");
const _ = require("lodash");

module.exports = class Stores extends Parent {
  constructor() {
    super();
    this.className = "Stores";
    this.queries.upsert = `insert into stores
          (uuid, client_id, title, address) 
        values 
          ($[uuid], $[client_id], $[title], $[address]) 
        on conflict (uuid) do nothing`;
  }
  getClientStores(clientId) {
    return db.manyOrNone("select * from stores where client_id=$1", clientId);
  }
  prepareRequestedStores(stores, client) {
    return Promise.map(stores, store => ({
      uuid: store.uuid,
      client_id: client.id,
      title: store.name,
      address: store.address
    }));
  }
  exactOrAllStores(clientId, storeUuid) {
    return db
      .manyOrNone("select * from stores where client_id=$1", clientId)
      .then(stores => {
        stores = _.map(stores, "uuid");
        if (storeUuid) {
          stores = _.intersection(stores, [storeUuid]);
        }
        if (!stores.length)
          return Promise.reject(new Error("Нет магазинов по вашему запросу"));
        return Promise.resolve(stores);
      });
  }
  receiptsDataWithDelta(clientId, previous, from, to) {
    let query = `
      select
        uuid, 
        title, 
        current_revenue as revenue, 
        revenue_delta, 
        current_avg_receipt as avg_receipt, 
        avg_receipt_delta, 
        current_receipts as receipts, 
        receipts_delta
      from    
          (select 
              store_uuid, 
              current_revenue, 
              ((current_revenue - previous_revenue)::numeric(12,2)/nullif(previous_revenue::numeric(12,2),0))::numeric(12,3) as revenue_delta,
              current_avg_receipt,
              ((current_avg_receipt - previous_avg_receipt)::numeric(12,2)/nullif(previous_avg_receipt::numeric(12,2),0))::numeric(12,3) as avg_receipt_delta,
              current_receipts,
              ((current_receipts - previous_receipts)::numeric(12,2)/nullif(previous_receipts::numeric(12,2),0))::numeric(12,3) as receipts_delta
          from
            (select 
              store_uuid as store_uuid, 
              sum(sum)::bigint as current_revenue, 
              avg(sum)::integer as current_avg_receipt, 
              count(*) as current_receipts 
            from receipts 
            where 
              datetime between $[from] and $[to] 
              and store_uuid in (select uuid from stores where client_id=$[clientId]) 
            group by store_uuid) 
            as current
          left join
            (select 
              store_uuid as p_store_uuid, 
              sum(sum)::bigint as previous_revenue, 
              avg(sum)::integer as previous_avg_receipt, 
              count(*) as previous_receipts  
            from receipts 
            where 
              datetime between $[previous] and $[from] 
              and store_uuid in (select uuid from stores where client_id=$[clientId]) 
            group by store_uuid) 
            as previous
          on current.store_uuid = previous.p_store_uuid) as united 
      inner join (select uuid, title from stores) as stores
      on united.store_uuid = stores.uuid`;
    return db
      .manyOrNone(query, { clientId, previous, from, to })
      .then(resultList =>
        Promise.resolve(
          _.map(resultList, item => {
            item.revenue = _.toInteger(item.revenue);
            item.revenue_delta = _.toNumber(item.revenue_delta);
            item.avg_receipt_delta = _.toNumber(item.avg_receipt_delta);
            item.receipts = _.toInteger(item.receipts);
            item.receipts_delta = _.toNumber(item.receipts_delta);
            return item;
          })
        )
      );
  }
  countClientStoresCommodities(clientId, storeUuid, from, to) {
    const query = `
      select count(*)
      from
          (select commodity_uuid
          from positions
          where
              receipt_uuid in
                  (select uuid 
                  from receipts 
                  where
                      store_uuid in ($1:csv) and 
                      datetime between $2 and $3)
      group by commodity_uuid) as grouped`;
    return this.exactOrAllStores(clientId, storeUuid)
      .then(storeUuids => db.oneOrNone(query, [storeUuids, from, to]))
      .then(result =>
        Promise.resolve((result && _.toInteger(result.count)) || 0)
      );
  }
  clientStoresSellsList(
    clientId,
    storeUuid,
    previous,
    from,
    to,
    limit,
    offset
  ) {
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
                              datetime between $3 and $4
                              and store_uuid in ($1:csv)
                          )
                  group by commodity_uuid
                  order by revenue_sum desc
                  limit $5
                  offset $6) as sells
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
                              datetime between $2 and $3
                              and store_uuid in ($1:csv)
                          )
                  group by commodity_uuid) as prev_sells
              on prev_sells.prev_com_uuid=sells.commodity_uuid) as whole_sales
          inner join commodities
          on commodities.uuid=whole_sales.commodity_uuid
      order by revenue desc
    `;
    return this.exactOrAllStores(clientId, storeUuid).then(storeUuids =>
      db
        .manyOrNone(query, [storeUuids, previous, from, to, limit, offset])
        .then(resultList =>
          Promise.resolve(
            _.map(resultList, item => {
              item.revenue = _.toInteger(item.revenue);
              item.revenue_delta = _.toNumber(item.revenue_delta);
              item.quantity = _.toInteger(item.quantity);
              item.quantity_delta = _.toNumber(item.quantity_delta);
              return item;
            })
          )
        )
    );
  }
};
