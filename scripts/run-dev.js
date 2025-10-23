#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const workspace = process.argv[2] || 'backend';
const cwd = path.resolve(__dirname, '..', workspace);

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const child = spawn(npmCommand, ['run', 'dev'], {
  cwd,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
