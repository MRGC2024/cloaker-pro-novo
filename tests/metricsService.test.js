const test = require('node:test');
const assert = require('node:assert/strict');
const { createMetricsService } = require('../services/metricsService');

test('metrics service retorna stats numéricos mesmo com dados vazios', async () => {
  const fakeDb = {
    usePg: false,
    get: async () => ({ total: null, blocked: null, allowed: null, bots: null, mobile: null, desktop: null }),
    all: async () => []
  };
  const svc = createMetricsService({
    db: fakeDb,
    getBrasiliaDateRange: () => ({ start: '2026-01-01 00:00:00', end: '2026-01-02 00:00:00' })
  });
  const r = await svc.getStatsForUser(1, 'today', null);
  assert.equal(r.total, 0);
  assert.ok(Array.isArray(r.byCountry));
});
