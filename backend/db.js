const mysql = require('mysql2/promise');

const {
  DB_HOST = 'localhost',
  DB_USER = 'psau_user',
  DB_PASSWORD = 'psau_pass',
  DB_NAME = 'psau_ai',
  DB_PORT = 3306
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  connectionLimit: 10,
  timezone: 'Z'
});

module.exports = pool;
