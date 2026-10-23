// Kongvid - store data sederhana berbasis file JSON (dev-friendly)
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'server', 'data');
const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  history: path.join(DATA_DIR, 'history.json'),
  jobs: path.join(DATA_DIR, 'jobs.json'),
  subs: path.join(DATA_DIR, 'subs.json'),
};

for (const f of Object.values(FILES)) {
  const dir = path.dirname(f);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(f)) fs.writeFileSync(f, '[]');
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(FILES[name], 'utf8'));
  } catch {
    return [];
  }
}

function write(name, rows) {
  fs.writeFileSync(FILES[name], JSON.stringify(rows, null, 2));
}

module.exports = { read, write, DATA_DIR };
