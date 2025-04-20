// This script sets up the MySQL database for the application

const mysql = require('mysql2/promise');

async function setupDatabase() {
  // Connect without a database first to create it if not exists
  let connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sharmajai0309'
  });

  console.log('Connected to MySQL server');

  // Create database if it doesn't exist
  await connection.query('CREATE DATABASE IF NOT EXISTS edumanage');
  console.log('Database "edumanage" created or already exists');

  // Close initial connection
  await connection.end();

  // Connect to the specific database for further setup
  connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sharmajai0309',
    database: 'edumanage'
  });

  console.log('Connected to edumanage database');

  // Create session table for express-mysql-session
  const sessionTableSQL = `
    CREATE TABLE IF NOT EXISTS sessions (
      session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
      expires int(11) unsigned NOT NULL,
      data mediumtext COLLATE utf8mb4_bin,
      PRIMARY KEY (session_id)
    )
  `;

  await connection.query(sessionTableSQL);
  console.log('Sessions table created or already exists');

  // Close connection
  await connection.end();
  console.log('Database setup completed successfully');
}

setupDatabase().catch(err => {
  console.error('Error setting up database:', err);
  process.exit(1);
});