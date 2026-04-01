const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAllowedBlockedCountries } = require('../services/siteService');

test('normaliza países e remove conflitos entre permitidos/bloqueados', () => {
  const r = normalizeAllowedBlockedCountries('br,us,br', 'us,ar,xx');
  assert.equal(r.allowed, 'BR,US');
  assert.equal(r.blocked, 'AR,XX');
});

test('fallback de permitidos usa BR', () => {
  const r = normalizeAllowedBlockedCountries('', '');
  assert.equal(r.allowed, 'BR');
  assert.equal(r.blocked, '');
});
