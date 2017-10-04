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
    cashierReportData: require("./reports/cashierReportData")
  },
  schedule: {
    populateSchedule: require("./schedule/populateSchedule"),
    loadFromSchedule: require("./schedule/loadFromSchedule")
  }
};
