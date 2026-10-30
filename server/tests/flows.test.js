const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const database = new PGlite();
const sent = [];
let mailFails = false;
require.cache[require.resolve('../db')] = { exports: {
    query: (...args) => database.query(...args),
    connect: async () => ({ query: (...args) => database.query(...args), release() {} })
} };
require.cache[require.resolve('../mail')] = { exports: async (email, token) => {
    if (mailFails) throw new Error('SMTP offline');
    sent.push({ email, token });
} };
process.env.JWT_SECRET = 'test-only-secret';
const app = require('../server');
let master, player, outsider, campaign;
const password = 'test-password-123';
async function createAccount(username) {
    const email = `${username}@example.com`;
    const response = await request(app).post('/api/users').send({ username, email, password }).expect(201);
    return { id: response.body.usuario.id, email, token: sent.at(-1).token };
}
async function verifyAndLogin(user) {
    await request(app).post('/api/email/verify').send({ email: user.email, code: user.token }).expect(200);
    user.auth = (await request(app).post('/api/login').send({ email: user.email, password }).expect(200)).body.token;
}
const auth = user => ({ Authorization: `Bearer ${user.auth}` });
before(async () => {
    const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_accounts_campaigns.sql'), 'utf8');
    await database.exec(sql);
    await database.exec(sql); // Migration can be repeated without losing data.
});
after(() => database.close());
test('accounts, one-use confirmation, expiry, resend and campaign authorization', async () => {
    await request(app).post('/api/users').send({ username: 'invalid', email: 'invalid', password }).expect(400);
    await request(app).post('/api/users').send({ username: '   ', email: 'ok@example.com', password }).expect(400);
    master = await createAccount('master');
    await request(app).post('/api/login').send({ email: master.email, password }).expect(403);
    const oldSession = jwt.sign({ userId: master.id }, process.env.JWT_SECRET);
    await request(app).get('/api/sheets').set('Authorization', `Bearer ${oldSession}`).expect(403);
    const stored = await database.query('SELECT token_hash FROM email_verifications WHERE user_id = $1', [master.id]);
    assert.notEqual(stored.rows[0].token_hash, master.token);
    await verifyAndLogin(master);
    await request(app).post('/api/email/verify').send({ email: master.email, code: master.token }).expect(400);
    player = await createAccount('player');
    await database.query("UPDATE email_verifications SET expires_at = NOW() - INTERVAL '1 second', sent_at = NOW() - INTERVAL '2 minutes' WHERE user_id = $1", [player.id]);
    await request(app).post('/api/email/verify').send({ email: player.email, code: player.token }).expect(400);
    await request(app).post('/api/email/resend').send({ email: player.email, password: 'wrong' }).expect(401);
    await request(app).post('/api/email/resend').send({ email: player.email, password }).expect(200);
    await request(app).post('/api/email/verify').send({ email: player.email, code: player.token }).expect(400);
    player.token = sent.at(-1).token;
    await verifyAndLogin(player);
    outsider = await createAccount('outsider');
    await verifyAndLogin(outsider);
    await request(app).get('/api/campaigns').expect(401);
    campaign = (await request(app).post('/api/campaigns').set(auth(master)).send({ name: 'Adventure', quickNotes: 'secret', players: [{ id: outsider.id }] }).expect(201)).body.campanha;
    await request(app).get(`/api/campaigns/${campaign.id}`).set(auth(outsider)).expect(404);
    await request(app).post(`/api/campaigns/${campaign.id}/players`).set(auth(outsider)).send({ userId: outsider.id }).expect(404);
    await request(app).post(`/api/campaigns/${campaign.id}/players`).set(auth(master)).send({ userId: 'bad' }).expect(400);
    await request(app).post(`/api/campaigns/${campaign.id}/players`).set(auth(master)).send({ userId: master.id }).expect(400);
    await request(app).post(`/api/campaigns/${campaign.id}/players`).set(auth(master)).send({ userId: player.id }).expect(201);
    await request(app).post(`/api/campaigns/${campaign.id}/players`).set(auth(master)).send({ userId: player.id }).expect(409);
    const list = await request(app).get('/api/campaigns').set(auth(player)).expect(200);
    assert.equal(list.body.campanhas[0].role, 'player');
    assert.equal(list.body.campanhas[0].quickNotes, undefined);
    await request(app).get(`/api/campaigns/${campaign.id}`).set(auth(player)).expect(404);
    await request(app).put(`/api/campaigns/${campaign.id}`).set(auth(player)).send({ quickNotes: 'hacked' }).expect(404);
    await request(app).put(`/api/campaigns/${campaign.id}`).set(auth(master)).send({ quickNotes: 'updated', players: [] }).expect(200);
    const detail = await request(app).get(`/api/campaigns/${campaign.id}`).set(auth(master)).expect(200);
    assert.equal(detail.body.campanha.quickNotes, 'updated');
    assert.equal(detail.body.campanha.players.length, 1);
    const outsiders = await request(app).get('/api/campaigns').set(auth(outsider)).expect(200);
    assert.equal(outsiders.body.campanhas.length, 0);
    await request(app).delete(`/api/campaigns/${campaign.id}/players/${player.id}`).set(auth(master)).expect(200);
    const removed = await request(app).get('/api/campaigns').set(auth(player)).expect(200);
    assert.equal(removed.body.campanhas.length, 0);
});
test('SMTP failure leaves recoverable unverified account and does not expose token', async () => {
    mailFails = true;
    const result = await request(app).post('/api/users').send({ username: 'offline', email: 'offline@example.com', password }).expect(201);
    assert.equal(result.body.emailSent, false);
    assert.equal(result.body.token, undefined);
    const tokens = await database.query('SELECT * FROM email_verifications WHERE user_id = $1', [result.body.usuario.id]);
    assert.equal(tokens.rows.length, 0);
    mailFails = false;
    await request(app).post('/api/email/resend').send({ email: 'offline@example.com', password }).expect(200);
    await request(app).post('/api/email/resend').send({ email: 'offline@example.com', password }).expect(429);
    await request(app).post('/api/email/verify').send({ email: 'offline@example.com', code: sent.at(-1).token }).expect(200);
});

test('verification codes are tied to the account and blocked after five incorrect attempts', async () => {
    const user = await createAccount('tentativas');
    const incorrect = user.token === '000000' ? '000001' : '000000';
    for (let attempt = 1; attempt <= 5; attempt++) {
        await request(app).post('/api/email/verify')
            .send({ email: user.email, code: incorrect })
            .expect(attempt === 5 ? 429 : 400);
    }
    await request(app).post('/api/email/verify')
        .send({ email: user.email, code: user.token }).expect(429);
    const result = await database.query('SELECT attempts FROM email_verifications WHERE user_id = $1', [user.id]);
    assert.equal(result.rows[0].attempts, 5);
});
