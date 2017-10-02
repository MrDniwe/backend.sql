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
  controllers.receipts.receiptsReportData
);

cote.dbResponder.on("populateSchedule", controllers.schedule.populateSchedule);

//TODO однократный вызов для тестов
// controllers.schedule
//   .populateSchedule()
//   .then(() => controllers.schedule.loadFromSchedule());
setInterval(() => {
  controllers.schedule
    .populateSchedule()
    .then(() => controllers.schedule.loadFromSchedule());
}, config.schedule.scheduleTimeoutMs);
