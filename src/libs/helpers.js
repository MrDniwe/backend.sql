const _ = require("lodash");
const moment = require("moment");

module.exports = {
  delta: (current, previous) =>
    previous ? (current - previous) / previous : undefined,

  flattenHours: clientTimeSlice => {
    clientTimeSlice = _.omit(clientTimeSlice, ["fromTime", "toTime"]);
    let flatHours = {};
    _.forEach(clientTimeSlice, (dayItem, dayKey) => {
      let clientDay = moment(dayKey);
      let datePrefix = moment().isSame(clientDay, "year")
        ? clientDay.format("DD.MM")
        : clientDay.format("DD.MM.YY");
      _.forEach(dayItem.hours, (hourItem, hourKey) => {
        flatHours[`${datePrefix}\n${hourKey}`] = hourItem;
      });
    });
    return flatHours;
  },

  previousFromPayload: payload =>
    moment(payload.from).subtract(moment(payload.to) - moment(payload.from))
};
