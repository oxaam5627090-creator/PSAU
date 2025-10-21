const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { STORAGE_PATH, UPLOAD_TTL_DAYS } = require('./config');

const millisInDay = 24 * 60 * 60 * 1000;

function purgeExpiredFiles() {
  const now = Date.now();
  const cutoff = now - UPLOAD_TTL_DAYS * millisInDay;

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (stats.mtimeMs < cutoff) {
        fs.rmSync(fullPath, { force: true });
      }
    }
  };

  walk(STORAGE_PATH);
}

function scheduleUploadCleanup() {
  cron.schedule('0 3 * * *', purgeExpiredFiles); // daily at 03:00
}

module.exports = {
  purgeExpiredFiles,
  scheduleUploadCleanup
};
