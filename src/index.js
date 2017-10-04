const cote = require("./cote");
const controllers = require("./controllers/controllers");
const config = require("./config");

cote.dbResponder.on(
  "clearClientsRelations",
  controllers.clients.clearClientsRelations
);

cote.dbResponder.on(
  "upsertClient",
  controllers.clients.upsertClientWithBasicRelations
);

cote.dbResponder.on("loadSessions", controllers.sessions.loadSessions);

cote.dbResponder.on("loadSells", controllers.sells.loadSells);

cote.dbResponder.on(
  "receiptsReportData",
  controllers.reports.receiptsReportData
);

cote.dbResponder.on("summaryReportData", controllers.reports.summaryReportData);

cote.dbResponder.on("cashierReportData", controllers.reports.cashierReportData);

cote.dbResponder.on("populateSchedule", controllers.schedule.populateSchedule);

setInterval(() => {
  controllers.schedule
    .populateSchedule()
    .then(() => controllers.schedule.loadFromSchedule());
}, config.schedule.scheduleTimeoutMs);
