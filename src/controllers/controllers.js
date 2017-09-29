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
  receipts: {
    receiptsReportData: require("./receipts/receiptsReportData")
  },
  schedule: {
    populateSchedule: require("./schedule/populateSchedule"),
    loadFromSchedule: require("./schedule/loadFromSchedule")
  }
};
