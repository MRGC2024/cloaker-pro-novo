const test = require('node:test');
const assert = require('node:assert/strict');
const { createFallbackService } = require('../services/fallbackService');

test('fallback service executa sem erro com base vazia', async () => {
  const fakeDb = {
    run: async () => {},
    get: async () => null,
    all: async () => []
  };
  const svc = createFallbackService({
    db: fakeDb,
    usePg: false,
    panelDomain: '',
    sendTelegramMessage: async () => {},
    getGlobalFallbacks: async () => []
  });
  await assert.doesNotReject(async () => svc.runFallbackHealthCheck());
});
