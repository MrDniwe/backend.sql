const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");
const moment = require("moment");

module.exports = async req => {
  await Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ]);
  await constraints.clientFromTo(
    req.payload.id,
    req.payload.from,
    req.payload.to
  );
  let [fromMoment, toMoment] = [
    moment(req.payload.from).utc().startOf("day"),
    moment(req.payload.to).utc().endOf("day")
  ];
  let inFact;
  try {
    inFact = await models.schedule.countLoadedDays(
      req.payload.id,
      fromMoment,
      toMoment,
      req.payload.storeUuid
    );
  } catch (err) {
    console.error(err);
  }
  return {
    // payload: req.payload,
    duration: Math.ceil((toMoment - fromMoment) / (1000 * 60 * 60 * 24)),
    inFact: inFact.count
  };
};
