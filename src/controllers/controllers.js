module.exports = {
  clients: {
    clearClientsRelations: require("./client/clearClientsRelations"),
    upsertClientWithBasicRelations: require("./client/upsertClientWithBasicRelations")
  },
  sells: {
    loadSells: require("./sells/loadSells")
  },
  sessions: {
    loadSessions: require("./sessions/loadSessions")
  },
  receipts: {
    receiptsReportData: require("./receipts/receiptsReportData")
  },
  schedule: {
    populateSchedule: require("./schedule/populateSchedule")
  }
};
