const Clients = require("./clients");
const Stores = require("./stores");
const Employees = require("./employees");
const Devices = require("./devices");
const Commodities = require("./commodities");
const Sessions = require("./sessions");
const Days = require("./days");
const StoreEmployees = require("./store_employees");
const Receipts = require("./receipts");
const Positions = require("./positions");
const Payments = require("./payments");
const Schedule = require("./schedule");

module.exports = {
  clients: new Clients(),
  stores: new Stores(),
  employees: new Employees(),
  storeEmployees: new StoreEmployees(),
  devices: new Devices(),
  commodities: new Commodities(),
  sessions: new Sessions(),
  days: new Days(),
  receipts: new Receipts(),
  positions: new Positions(),
  payments: new Payments(),
  schedule: new Schedule()
};
