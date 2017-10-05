const models = require("../../models/_models");
const constraints = require("../../constraints");
const Promise = require("bluebird");

module.exports = req => {
  return Promise.all([
    constraints.payloadPresents(req),
    constraints.clientIdPresents(req)
  ]).then(() =>
    Promise.all([
      Promise.resolve("basic"),
      Promise.resolve("best"),
      Promise.resolve("worst")
    ]).spread((basic, best, worst) =>
      Promise.resolve({
        basic,
        best,
        worst
      })
    )
  );
};
