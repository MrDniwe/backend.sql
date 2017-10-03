const Promise = require("bluebird");
const moment = require("moment");

module.exports = {
  payloadPresents: req => {
    if (!req.payload)
      return Promise.reject(new Error("Отсутствуют данные для запроса"));
    else return Promise.resolve();
  },
  clientIdPresents: req => {
    if (!(req.payload && req.payload.id))
      return Promise.reject(new Error("Отсутствует ID клиента"));
    else return Promise.resolve();
  },
  tokenPresents: req => {
    if (!(req.payload && req.payload.token))
      return Promise.reject(new Error("Отсутствует app token клиента"));
    else return Promise.resolve();
  },
  clientFromTo: (clientId, dateFrom, dateTo) => {
    if (!dateFrom || !moment(dateFrom).isValid())
      return Promise.reject(new Error("Не валидная начальная дата"));
    if (!dateTo || !moment(dateTo).isValid() || dateTo <= dateFrom)
      return Promise.reject(new Error("Не валидная конечная дата"));
    if (!clientId)
      return Promise.reject(
        new Error("Отсутсвует ID клиента в методе получения чеков по магазинам")
      );
    return Promise.resolve([clientId, dateFrom, dateTo]);
  }
};
