const mysql = require('mysql2/promise');
const { config } = require('./config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function migrate(connection = pool) {
  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      university_id VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      college VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      schedule JSON NULL,
      personal_info JSON NULL,
      preferred_language VARCHAR(5) NOT NULL DEFAULT 'ar',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `;

  const createChats = `
    CREATE TABLE IF NOT EXISTS chats (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      messages JSON NOT NULL,
      summary TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  const createUploads = `
    CREATE TABLE IF NOT EXISTS uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      file_type VARCHAR(20) NOT NULL,
      original_name VARCHAR(255) NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `;

  await connection.query(createUsers);
  await connection.query(createChats);
  await connection.query(createUploads);

  try {
    await connection.query(
      "ALTER TABLE users ADD COLUMN preferred_language VARCHAR(5) NOT NULL DEFAULT 'ar' AFTER personal_info;"
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }

  try {
    await connection.query(
      'ALTER TABLE uploads ADD COLUMN original_name VARCHAR(255) NOT NULL AFTER file_type;'
    );
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      throw error;
    }
  }
}

module.exports = { pool, migrate };
