module.exports = {
  clients: {
    clearClientsRelations: require("./client/clearClientsRelations"),
    upsertClientWithBasicRelations: require("./client/upsertClientWithBasicRelations")
  },
  sells: {
    loadSells: require("./sells/loadSells"),
    loadSellsByDay: require("./sells/loadSellsByDay")
  },
  sessions: {
    loadSessions: require("./sessions/loadSessions"),
    loadSessionsByDay: require("./sessions/loadSessionsByDay")
  },
  reports: {
    receiptsReportData: require("./reports/receiptsReportData"),
    summaryReportData: require("./reports/summaryReportData"),
    cashierReportData: require("./reports/cashierReportData"),
    storesReportData: require("./reports/storesReportData"),
    storesGoodsReportData: require("./reports/storesGoodsReportData"),
    goodsReportData: require("./reports/goodsReportData")
  },
  schedule: {
    populateSchedule: require("./schedule/populateSchedule"),
    loadFromSchedule: require("./schedule/loadFromSchedule")
  }
};
