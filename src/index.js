const cote = require("./cote");
const controllers = require("./controllers/controllers");

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
