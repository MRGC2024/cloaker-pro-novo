const test = require('node:test');
const assert = require('node:assert/strict');
const { corsOriginResolver } = require('../utils/security');

test('corsOriginResolver permite origem configurada', async () => {
  const resolver = corsOriginResolver(new Set(['https://app.exemplo.com']));
  await new Promise((resolve, reject) => {
    resolver('https://app.exemplo.com', (err, ok) => {
      if (err) return reject(err);
      assert.equal(ok, true);
      resolve();
    });
  });
});

test('corsOriginResolver bloqueia origem fora da lista', async () => {
  const resolver = corsOriginResolver(new Set(['https://app.exemplo.com']));
  await new Promise((resolve) => {
    resolver('https://outro.com', (err) => {
      assert.ok(err);
      resolve();
    });
  });
});
