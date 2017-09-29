const models = require("../../models/_models");
const constraints = require("../../constraints");
const cote = require("../../cote");
const _ = require("lodash");
const moment = require("moment");
const Promise = require("bluebird");

module.exports = (token, storeUuid, date) => {
  console.log(token, storeUuid, moment(date).format("YYYY-MM-DD"));
  //TODO сначала пометить в расписании как pending
  return cote.remoteRequester
    .send({
      type: "getSellsByDay",
      token: token,
      storeUuid: storeUuid,
      day: moment(date).format("YYYY-MM-DD")
    })
    .then();
};
