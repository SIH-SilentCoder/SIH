const { connectDB } = require('../config/db');

// Cache the DB init promise so it only runs once per serverless instance
let dbInitPromise = null;

const getApp = () => {
  const app = require('../server');
  return app.app || app;
};

module.exports = async (req, res) => {
  // Ensure DB (or local file fallback) is initialized before handling any request
  if (!dbInitPromise) {
    dbInitPromise = connectDB().catch((err) => {
      console.warn('DB init failed in handler, will retry next request:', err.message);
      dbInitPromise = null; // allow retry on next request
    });
  }
  await dbInitPromise;

  return getApp()(req, res);
};
