const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const { createApiRateLimit } = require('../middleware/apiRateLimit');

test('apiRateLimit retorna 429 ao exceder limite', async () => {
  const app = express();
  app.use((req, res, next) => { req.session = {}; next(); });
  app.use(createApiRateLimit({ windowMs: 1000, max: 2 }));
  app.get('/api/ping', (req, res) => res.json({ ok: true }));

  await request(app).get('/api/ping').expect(200);
  await request(app).get('/api/ping').expect(200);
  const third = await request(app).get('/api/ping').expect(429);
  assert.equal(typeof third.body.error, 'string');
});

test('apiRateLimit ignora rota /api/track', async () => {
  const app = express();
  app.use((req, res, next) => { req.session = {}; next(); });
  app.use(createApiRateLimit({ windowMs: 1000, max: 1 }));
  app.get('/api/track', (req, res) => res.json({ ok: true }));

  await request(app).get('/api/track').expect(200);
  await request(app).get('/api/track').expect(200);
});
