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
  }
};
