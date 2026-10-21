const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../..');
const id = '11111111-1111-4111-8111-111111111111';
function page(name, data) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, `pages/${name}.html`), 'utf8'), {
        url: `http://localhost/pages/${name}.html?id=${id}`, runScripts: 'outside-only', pretendToBeVisual: true
    });
    const calls = [];
    dom.window.localStorage.setItem('nythra_token', 'test');
    dom.window.fetch = async (url, options) => {
        calls.push({ url, options });
        return { ok: true, json: async () => url.endsWith('/api/me') ? { usuario: { id } } : data };
    };
    dom.window.eval(fs.readFileSync(path.join(root, 'scripts/api.js'), 'utf8'));
    return { dom, calls };
}
test('campaign list shows account ID and linked campaigns', async () => {
    const { dom } = page('campaigns', { campanhas: [{ id, name: 'Aventura', createdAt: new Date().toISOString(), role: 'player' }] });
    dom.window.eval(fs.readFileSync(path.join(root, 'scripts/pages/campaigns.js'), 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.match(dom.window.document.querySelector('#account-id').textContent, new RegExp(id));
    assert.equal(dom.window.document.querySelectorAll('.campaign-card').length, 1);
    dom.window.close();
});
test('dashboard loads from API and session changes are persisted', async () => {
    const { dom, calls } = page('campaign-dashboard', { campanha: { id, name: 'Aventura', players: [{ id, playerName: 'Jogador', characterName: 'Jogador' }] } });
    dom.window.eval(fs.readFileSync(path.join(root, 'scripts/pages/campaign-dashboard.js'), 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 30));
    const doc = dom.window.document;
    assert.equal(doc.querySelector('main').hidden, false);
    assert.equal(doc.querySelector('#campaign-name').textContent, 'Aventura');
    assert.equal(doc.querySelectorAll('.player-card').length, 1);
    assert.equal(calls.filter(call => call.options?.method === 'PUT').length, 0);
    doc.querySelector('#session-title-input').value = 'Primeira sessão';
    doc.querySelector('#session-number-input').value = '1';
    doc.querySelector('#session-form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await new Promise(resolve => setTimeout(resolve, 30));
    const saved = calls.find(call => call.options?.method === 'PUT');
    assert.equal(JSON.parse(saved.options.body).currentSession.title, 'Primeira sessão');
    assert.equal(doc.querySelector('#campaign-save-status').textContent, 'Salvo');
    dom.window.close();
});
