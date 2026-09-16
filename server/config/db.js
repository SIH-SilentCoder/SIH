const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.warn(`⚠️ PostgreSQL pool connection error (${err.code || err.message}). Reconnecting on next query.`);
});

let isConnected = false;

const connectDB = async () => {
  try {
    const { registry, initLocalStorage } = require('../utils/postgresModel');

    // Test connection
    await pool.query('SELECT 1');
    isConnected = true;

    for (const model of registry.values()) {
      await model.ensureTable();
    }

    console.log(`✅ PostgreSQL connected to ${process.env.PGDATABASE || 'configured database'}`);
  } catch (error) {
    isConnected = false;
    console.warn(`⚠️ PostgreSQL connection failed (${error.message}).`);
    console.log('📦 Using Local File Storage fallback (server/data/local_db.json).');
    const { initLocalStorage } = require('../utils/postgresModel');
    await initLocalStorage();
  }
};

const closeDB = async () => {
  if (isConnected) {
    await pool.end();
  }
};

module.exports = { connectDB, closeDB, pool, isConnected: () => isConnected };
