#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const mysql = require('mysql2');

// Set workspace (default to 'backend')
const workspace = process.argv[2] || 'backend';
const cwd = path.resolve(__dirname, '..', workspace);

// Log which workspace we're working with
console.log(`Running development server in the '${workspace}' workspace...`);
console.log(`Working directory: ${cwd}`);

// Log the command being executed
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log(`Running command: ${npmCommand} run dev`);

// Start the child process
const child = spawn(npmCommand, ['run', 'dev'], {
  cwd,
  stdio: 'inherit',
  shell: true,  // Use shell to ensure compatibility with Windows
});

// Log success or failure
child.on('spawn', () => {
  console.log('Successfully spawned the child process to run the dev server.');
});

// Handle exit event from the child process
child.on('exit', (code) => {
  if (code === 0) {
    console.log('Development server started successfully.');
  } else {
    console.error(`Development server failed with exit code ${code}`);
  }
  process.exit(code ?? 0);
});

// Handle errors in spawning the process
child.on('error', (err) => {
  console.error('Failed to spawn child process:', err);
  process.exit(1);  // Exit with error code
});

// Adding more detailed logging for database connection
console.log('Checking database connection...');

// MySQL database credentials
const dbConfig = {
  host: 'localhost',
  user: 'psau_admin',
  password: 'psau_password',
  database: 'psau_ai_assistant',
  port: 3306
};

// Create a connection to MySQL
const dbConnection = mysql.createConnection(dbConfig);

// Try to connect to the database
dbConnection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database successfully.');
  
  // Close the connection after verifying
  dbConnection.end();
});
