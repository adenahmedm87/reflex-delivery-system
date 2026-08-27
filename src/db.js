const { Pool } = require('pg');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing from .env');
const local = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false }
});
module.exports = { pool };