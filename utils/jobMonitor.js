function createJobMonitor() {
  const jobs = {};

  function markJobStart(name) {
    jobs[name] = jobs[name] || { runs: 0, success: 0, fail: 0, avg_ms: 0 };
    jobs[name].running = true;
    jobs[name].last_start_at = new Date().toISOString();
    jobs[name]._start_ms = Date.now();
  }

  function markJobDone(name, ok, errMsg) {
    jobs[name] = jobs[name] || { runs: 0, success: 0, fail: 0, avg_ms: 0 };
    const j = jobs[name];
    j.running = false;
    j.runs += 1;
    if (ok) j.success += 1;
    else j.fail += 1;
    j.last_finish_at = new Date().toISOString();
    if (!ok) j.last_error = errMsg || 'Erro desconhecido';
    const elapsed = Math.max(0, Date.now() - (j._start_ms || Date.now()));
    j.last_duration_ms = elapsed;
    j.avg_ms = j.avg_ms ? Math.round((j.avg_ms * 0.8) + (elapsed * 0.2)) : elapsed;
    delete j._start_ms;
  }

  async function runMonitoredJob(name, fn) {
    markJobStart(name);
    try {
      await fn();
      markJobDone(name, true);
    } catch (e) {
      markJobDone(name, false, e && e.message ? e.message : 'Erro desconhecido');
      throw e;
    }
  }

  return { jobs, runMonitoredJob };
}

module.exports = { createJobMonitor };
