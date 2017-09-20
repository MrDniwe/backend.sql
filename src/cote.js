const coteBase = require("cote");

let cote;

if (process.env.COTE_NETWORK === "local") {
  cote = coteBase({ broadcast: "127.255.255.255" });
} else {
  cote = coteBase;
}

module.exports = new cote.Responder({
  name: "RESPONDER: cache DB",
  key: "cacheDB"
});
