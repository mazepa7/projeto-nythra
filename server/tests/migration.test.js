const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
test('migration preserves existing integer user IDs and accounts', async () => {
    const db = new PGlite();
    try {
        await db.exec(`CREATE TABLE users(id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW());
            INSERT INTO users(username,email,password_hash) VALUES ('existing','existing@example.com','hash');`);
        await db.exec(`CREATE TABLE email_verifications (
            user_id INTEGER PRIMARY KEY REFERENCES users(id), token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL, sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        INSERT INTO email_verifications(user_id, token_hash, expires_at)
            VALUES (1, 'legacy-hash', NOW() + INTERVAL '1 hour');`);
        const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_accounts_campaigns.sql'), 'utf8');
        await db.exec(sql);
        await db.exec(sql);
        const result = await db.query('SELECT id, email_verified_at FROM users');
        assert.equal(result.rows[0].id, 1);
        assert.equal(result.rows[0].email_verified_at, null);
        const oldVerification = await db.query('SELECT token_hash, attempts, verification_type FROM email_verifications WHERE user_id = 1');
        assert.equal(oldVerification.rows[0].token_hash, 'legacy-hash');
        assert.equal(oldVerification.rows[0].attempts, 0);
        assert.equal(oldVerification.rows[0].verification_type, 'link');
        const campaign = await db.query("INSERT INTO campaigns(owner_id,name) VALUES (1,'legacy') RETURNING id");
        await db.query('INSERT INTO campaign_players(campaign_id,user_id) VALUES ($1,1)', [campaign.rows[0].id]);
    } finally { await db.close(); }
});
