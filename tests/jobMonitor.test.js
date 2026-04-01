const test = require('node:test');
const assert = require('node:assert/strict');
const { createJobMonitor } = require('../utils/jobMonitor');

test('job monitor registra sucesso', async () => {
  const m = createJobMonitor();
  await m.runMonitoredJob('job_ok', async () => {});
  assert.equal(m.jobs.job_ok.success, 1);
  assert.equal(m.jobs.job_ok.fail, 0);
  assert.equal(m.jobs.job_ok.runs, 1);
});

test('job monitor registra falha', async () => {
  const m = createJobMonitor();
  await assert.rejects(() => m.runMonitoredJob('job_fail', async () => { throw new Error('x'); }));
  assert.equal(m.jobs.job_fail.success, 0);
  assert.equal(m.jobs.job_fail.fail, 1);
});
