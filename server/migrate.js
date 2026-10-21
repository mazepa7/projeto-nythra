const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
(async () => {
  try {
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/001_accounts_campaigns.sql'), 'utf8'));
    console.log('Banco atualizado. Contas existentes precisam confirmar o e-mail.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { await db.end(); }
})();
