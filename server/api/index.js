const app = require('../server');

module.exports = (req, res) => {
  const serverApp = app.app || app;
  return serverApp(req, res);
};
