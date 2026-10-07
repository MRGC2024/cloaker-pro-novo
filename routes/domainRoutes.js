const express = require('express');
const https = require('https');
const dns = require('dns').promises;

function createDomainRoutes(db) {
  const router = express.Router();

// CNAME target: só variáveis de ambiente e só se for host do Railway (*.railway.app).
// Se APP_CNAME_TARGET/RAILWAY_STATIC_URL estiver com domínio custom (ex.: iniiciopropo.sbs), ignora — senão aparece como "valor CNAME" errado.
function getCnameTarget(req) {
  const fromEnv = process.env.APP_CNAME_TARGET || process.env.RAILWAY_STATIC_URL || '';
  const host = fromEnv.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0] || '';
  if (!host) return '';
  if (/\.railway\.app$/i.test(host)) return host;
  return '';
}

// Adiciona domínio customizado no Railway via API (evita passo manual no painel).
// Requer: RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID.
// Retorna { ok: true } ou { ok: false, error: string }.
function addCustomDomainToRailway(domain) {
  const token = process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !serviceId || !projectId || !environmentId) {
    return Promise.resolve({ ok: false, error: 'Variáveis Railway não configuradas (RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_ID).' });
  }
  const body = JSON.stringify({
    query: `mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) {
        domain
        status { dnsRecords { recordType hostlabel requiredValue zone } }
      }
    }`,
    variables: {
      input: {
        domain: domain.trim().toLowerCase(),
        serviceId,
        projectId,
        environmentId
      }
    }
  });
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'backboard.railway.app',
        path: '/graphql/v2',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(body, 'utf8')
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.errors && json.errors.length) {
              const msg = json.errors[0].message || JSON.stringify(json.errors[0]);
              return resolve({ ok: false, error: msg });
            }
            if (json.data && json.data.customDomainCreate) {
              return resolve({ ok: true, data: json.data.customDomainCreate });
            }
            resolve({ ok: false, error: data || 'Resposta inesperada da API Railway.' });
          } catch (e) {
            resolve({ ok: false, error: e.message || 'Erro ao processar resposta da API.' });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: e.message || 'Erro de rede ao chamar Railway.' }));
    req.setTimeout(15000, () => {
      req.destroy();
      resolve({ ok: false, error: 'Timeout ao chamar API Railway.' });
    });
    req.write(body);
    req.end();
  });
}

// Remove domínio customizado do Railway via API (ao deletar no painel).
// Lista os domínios do serviço, encontra o id do custom domain pelo nome, e chama customDomainDelete.
function removeCustomDomainFromRailway(domain) {
  const token = process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !serviceId || !projectId || !environmentId) return Promise.resolve({ ok: false, state: 'unconfigured', error: 'Variáveis Railway não configuradas.' });

  function graphql(body) {
    const buf = Buffer.from(body, 'utf8');
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'backboard.railway.app',
        path: '/graphql/v2',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': buf.length }
      }, (res) => {
        let data = '';
        res.on('data', c => { data += c; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
      req.write(buf);
      req.end();
    });
  }

  const listQuery = JSON.stringify({
    query: 'query Domains($environmentId: String!, $projectId: String!, $serviceId: String!) { domains(environmentId: $environmentId, projectId: $projectId, serviceId: $serviceId) { customDomains { id domain } } }',
    variables: { environmentId, projectId, serviceId }
  });

  return graphql(listQuery).then(json => {
    if (json.errors && json.errors.length) {
      console.error('[Railway] domains query falhou:', json.errors[0].message);
      return { ok: false, state: 'failed', error: json.errors[0].message };
    }
    const domainsData = json.data && json.data.domains;
    let raw = (domainsData && (domainsData.customDomains || domainsData.custom_domains)) || [];
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.edges) raw = raw.edges.map(e => e.node || e);
    let custom = Array.isArray(raw) ? raw : [];
    if (custom.length && custom[0] && custom[0].node) custom = custom.map(e => e.node || e);
    const d = domain.trim().toLowerCase();
    const found = custom.find(c => ((c.domain || c.name || '').toLowerCase()) === d);
    if (!found || !(found.id || found.customDomainId)) return { ok: true, state: 'absent' };
    const idToDelete = found.id || found.customDomainId;
    const tryDelete = (mutationName, useInput) => {
      if (useInput) {
        const body = JSON.stringify({
          query: `mutation ${mutationName}($input: CustomDomainRemoveInput!) { ${mutationName}(input: $input) { id } }`,
          variables: { input: { id: idToDelete, projectId } }
        });
        return graphql(body);
      }
      const body = JSON.stringify({
        query: `mutation ${mutationName}($id: String!, $projectId: String!) { ${mutationName}(id: $id, projectId: $projectId) { id } }`,
        variables: { id: idToDelete, projectId }
      });
      return graphql(body);
    };
    const runRemoval = () =>
      tryDelete('customDomainRemove', false)
        .then(rem => {
          if (rem.errors && rem.errors.length) {
            const errMsg = rem.errors[0].message || '';
            return tryDelete('customDomainRemove', true).then(rem2 => {
              if (rem2.errors && rem2.errors.length) return { ok: false, state: 'failed', error: rem2.errors[0].message };
              return { ok: true, state: 'removed' };
            }).catch(() => ({ ok: false, error: errMsg }));
          }
          return { ok: true, state: 'removed' };
        })
        .then(r => {
          if (r.ok) return r;
          return tryDelete('customDomainDelete', false).then(del => {
            if (del.errors && del.errors.length) return { ok: false, state: 'failed', error: del.errors[0].message };
            return { ok: true, state: 'removed' };
          }).catch(() => r);
        });
    return runRemoval();
  }).catch(e => {
    console.error('[Railway] removeCustomDomainFromRailway:', e.message);
    return { ok: false, state: 'failed', error: e.message };
  });
}

// Extrai CNAME e TXT dos registros DNS (aceita recordType/record_type, requiredValue/required_value/value, hostlabel para _railway-verify)
function parseDnsRecordsFromRailway(rd) {
  let cnameVal = null;
  let txtVal = null;
  const status = rd.status || rd;
  // Token de verificação TXT pode vir no nível do domínio (algumas APIs)
  const domainTxt = (rd.verificationToken ?? rd.verification_token ?? status?.verificationToken ?? status?.verification_token ?? '').toString().trim();
  if (domainTxt) txtVal = domainTxt;
  let records = (status && (status.dnsRecords || status.dns_records)) || (rd.dnsRecords || rd.dns_records) || [];
  const arr = Array.isArray(records) ? records : [];
  for (const r of arr) {
    const rt = ((r.recordType || r.record_type || '') + '').toUpperCase();
    const val = r.requiredValue ?? r.required_value ?? r.value;
    const valStr = (typeof val === 'string' ? val : (val != null ? String(val) : '')).trim();
    const hostlabel = ((r.hostlabel || r.host_label || '') + '').toLowerCase();
    const isCname = rt === 'CNAME' || rt === 'DNS_RECORD_TYPE_CNAME';
    const isTxt = rt === 'TXT' || rt === 'DNS_RECORD_TYPE_TXT';
    const isTxtVerify = (hostlabel.includes('railway') && hostlabel.includes('verify')) || hostlabel === '_railway-verify';
    if (isCname && valStr) cnameVal = valStr;
    if ((isTxt || isTxtVerify) && valStr) txtVal = valStr;
  }
  return { cnameVal, txtVal };
}

// Busca domínios no Railway com registros DNS (para sincronizar CNAME + TXT)
async function fetchRailwayDomainsWithRecords() {
  const token = process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_TOKEN;
  const serviceId = process.env.RAILWAY_SERVICE_ID;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID;
  if (!token || !serviceId || !projectId || !environmentId) return { ok: false, domains: [], error: 'Variáveis Railway não configuradas.' };
  const body = JSON.stringify({
    query: `query DomainsWithRecords($e: String!, $p: String!, $s: String!) {
      domains(environmentId: $e, projectId: $p, serviceId: $s) {
        customDomains {
          id domain
          status { dnsRecords { recordType hostlabel requiredValue zone } }
        }
      }
    }`,
    variables: { e: environmentId, p: projectId, s: serviceId }
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'backboard.railway.app',
      path: '/graphql/v2',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body, 'utf8') }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors && json.errors.length) return resolve({ ok: false, domains: [], error: json.errors[0].message });
          const dd = json.data && json.data.domains;
          let raw = (dd && (dd.customDomains || dd.custom_domains)) || [];
          // API pode retornar conexão Relay: { edges: [ { node: { id, domain, status } } ] }
          if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.edges) raw = raw.edges.map(e => e.node || e);
          let custom = Array.isArray(raw) ? raw : [];
          if (custom.length && custom[0] && custom[0].node) custom = custom.map(e => e.node || e);
          resolve({ ok: true, domains: custom });
        } catch (e) {
          resolve({ ok: false, domains: [], error: e.message });
        }
      });
    });
    req.on('error', e => resolve({ ok: false, domains: [], error: e.message }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ ok: false, domains: [], error: 'Timeout' }); });
    req.write(body);
    req.end();
  });
}

// Busca status completo de um domínio (inclui dnsRecords com TXT; a listagem só traz CNAME)
function fetchDomainStatusFromRailway(domainId) {
  const token = process.env.RAILWAY_API_TOKEN || process.env.RAILWAY_TOKEN;
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (!token || !projectId || !domainId) return Promise.resolve(null);
  const body = JSON.stringify({
    query: 'query DomainStatus($id: String!, $projectId: String!) { domainStatus(id: $id, projectId: $projectId) { dnsRecords { recordType hostlabel requiredValue } } }',
    variables: { id: domainId, projectId }
  });
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'backboard.railway.app',
      path: '/graphql/v2',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'Content-Length': Buffer.byteLength(body, 'utf8') }
    }, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.errors && json.errors.length) return resolve(null);
          const st = json.data && json.data.domainStatus;
          resolve(st || null);
        } catch (e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

// API: Domínios do usuário logado – listar, criar, excluir. Qualquer usuário gerencia seus domínios.
async function refreshDomainDnsFromRailway(domainName) {
  const result = await fetchRailwayDomainsWithRecords();
  if (!result.ok) return { ok: false, error: result.error || 'Railway indisponível' };
  const d = String(domainName || '').trim().toLowerCase();
  const rd = (result.domains || []).find(x => ((x.domain || x.name || '').toLowerCase()) === d);
  if (!rd) return { ok: false, onRailway: false, error: 'Este domínio não está no Railway.' };
  const statusExtra = await fetchDomainStatusFromRailway(rd.id);
  if (statusExtra && Array.isArray(statusExtra.dnsRecords)) {
    rd.status = rd.status || {};
    rd.status.dnsRecords = [...(rd.status.dnsRecords || []), ...statusExtra.dnsRecords];
  }
  const parsed = parseDnsRecordsFromRailway(rd);
  const row = await db.get('SELECT id FROM allowed_domains WHERE LOWER(domain) = ? ORDER BY id DESC LIMIT 1', [d]);
  if (row && (parsed.cnameVal || parsed.txtVal)) {
    await db.run('UPDATE allowed_domains SET railway_cname_target = COALESCE(?, railway_cname_target), railway_txt_verify = COALESCE(?, railway_txt_verify) WHERE id = ?', [parsed.cnameVal, parsed.txtVal, row.id]);
  }
  return { ok: true, onRailway: true, cnameVal: parsed.cnameVal, txtVal: parsed.txtVal };
}

router.get('/api/domains', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const list = await db.all('SELECT id, domain, description, created_at, railway_cname_target, railway_txt_verify FROM allowed_domains WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC, id DESC', [userId]);
  const cnameTarget = getCnameTarget(req);
  const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
  let railwayConnected = false;
  let railwayError = null;
  const onRailway = new Set();
  if (user && user.role === 'admin') {
    const listed = await fetchRailwayDomainsWithRecords();
    railwayConnected = !!listed.ok;
    railwayError = listed.ok ? null : (listed.error || 'Railway indisponível');
    if (listed.ok) {
      for (const rd of listed.domains || []) {
        const name = (rd.domain || rd.name || '').toLowerCase().trim();
        if (name) onRailway.add(name);
      }
    }
  }
  const domains = list.map(row => ({
    ...row,
    on_railway: railwayConnected ? onRailway.has(String(row.domain || '').toLowerCase()) : null
  }));
  res.json({ domains, cnameTarget, railwayConnected, railwayError });
});

router.post('/api/domains', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const { domain, description, link_railway } = req.body || {};
  const d = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
  if (!d) return res.status(400).json({ error: 'Informe o domínio' });
  try {
    await db.run('INSERT INTO allowed_domains (user_id, domain, description) VALUES (?, ?, ?)', [userId, d, (description || '').trim() || null]);
    let row = await db.get('SELECT id, domain, description, created_at, railway_cname_target, railway_txt_verify FROM allowed_domains WHERE user_id = ? AND domain = ? ORDER BY id DESC LIMIT 1', [userId, d]);
    const payload = row || { id: 0, domain: d, description: (description || '').trim() || null, created_at: new Date().toISOString(), railway_cname_target: null };
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const isAdmin = user && user.role === 'admin';
    const publish = link_railway !== false && link_railway !== 0 && link_railway !== '0';
    if (isAdmin && publish) {
      const railway = await addCustomDomainToRailway(d);
        if (railway.ok) {
        let cnameValue = null;
        let txtVerify = null;
        const dnsRecords = railway.data && railway.data.status && railway.data.status.dnsRecords;
        if (Array.isArray(dnsRecords) && dnsRecords.length) {
          for (const r of dnsRecords) {
            const rt = (r.recordType || r.record_type || '').toUpperCase();
            const val = (r.requiredValue || r.required_value || '').trim();
            if ((rt === 'CNAME' || rt === 'DNS_RECORD_TYPE_CNAME') && val) cnameValue = val;
            if ((rt === 'TXT' || rt === 'DNS_RECORD_TYPE_TXT') && val) txtVerify = val;
          }
          if (!cnameValue) {
            const cnameRecord = dnsRecords.find(r => { const t = (r.recordType || r.record_type || '').toUpperCase(); return t === 'CNAME' || t === 'DNS_RECORD_TYPE_CNAME'; }) || dnsRecords[0];
            const val = cnameRecord && (cnameRecord.requiredValue || cnameRecord.required_value);
            cnameValue = (typeof val === 'string' && val.trim()) ? val.trim() : null;
          }
        }
        if (payload.id) {
          await db.run('UPDATE allowed_domains SET railway_cname_target = ?, railway_txt_verify = ? WHERE id = ?', [cnameValue || null, txtVerify || null, payload.id]);
          payload.railway_cname_target = cnameValue;
          payload.railway_txt_verify = txtVerify;
        }
        const refreshed = await refreshDomainDnsFromRailway(d);
        if (refreshed.ok) {
          if (refreshed.cnameVal) payload.railway_cname_target = refreshed.cnameVal;
          if (refreshed.txtVal) payload.railway_txt_verify = refreshed.txtVal;
        }
        payload.nextStep = refreshed.txtVal
          ? 'Cadastrado no painel e no Railway. CNAME e TXT já estão na tabela. Cole os dois no DNS. Não precisa abrir o Railway.'
          : 'Cadastrado no painel e no Railway. O CNAME está na tabela. Se o TXT ainda não apareceu, clique em Sincronizar com Railway daqui a pouco.';
        payload.railwaySynced = true;
        payload.on_railway = true;
      } else {
        const isMissingVars = (railway.error || '').indexOf('Variáveis Railway não configuradas') !== -1;
        if (isMissingVars) {
          payload.nextStep = 'Domínio cadastrado no painel. Para que os próximos sejam adicionados automaticamente no Railway (sem ir ao painel do Railway), configure no Railway → Variables: RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_PROJECT_ID e RAILWAY_ENVIRONMENT_ID. Use a tabela DNS abaixo no seu provedor e, se precisar, adicione este domínio manualmente em Railway → Networking → + Custom Domain.';
        } else {
          payload.nextStep = 'Domínio cadastrado no painel. Não foi possível adicionar no Railway: ' + (railway.error || 'erro desconhecido') + '. Adicione manualmente em Railway → Networking → + Custom Domain e use a tabela DNS abaixo no provedor.';
        }
        payload.railwaySynced = false;
        payload.railwayError = railway.error;
        if (railway.error) console.error('[Railway] customDomainCreate falhou:', railway.error);
      }
    } else if (isAdmin && !publish) {
      payload.nextStep = 'Guardado só no painel. Ele não foi para o Railway. Quando quiser o HTTPS e o DNS, use Publicar no Railway nesta linha.';
      payload.railwaySynced = false;
      payload.on_railway = false;
    } else {
      payload.nextStep = 'Domínio cadastrado no painel. A publicação no Railway fica com um admin.';
    }
    res.json(payload);
  } catch (e) {
    res.status(400).json({ error: 'Domínio já cadastrado para você' });
  }
});

// Verificar se o DNS do domínio já propagou (CNAME) ou se o domínio responde (útil com Cloudflare proxy).
router.get('/api/domains/check-dns', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const domain = (req.query.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!domain) return res.status(400).json({ error: 'Informe o parâmetro domain' });
  const expectedTarget = (req.query.target || '').trim() || getCnameTarget(req);
  let propagated = false;
  let resolved = null;
  let message = '';
  try {
    const cname = await dns.resolve(domain, 'CNAME').catch(() => []);
    resolved = Array.isArray(cname) && cname.length ? String(cname[0]).replace(/\.$/, '') : null;
    propagated = !!resolved && resolved.toLowerCase() === (expectedTarget || '').toLowerCase();
    if (propagated) {
      message = 'DNS propagado. O domínio está apontando corretamente para o servidor.';
    } else if (resolved) {
      message = `O domínio aponta para ${resolved}. O esperado é ${expectedTarget}.`;
    } else {
      message = 'Ainda não encontramos registro CNAME para este domínio.';
    }
  } catch (e) {
    if (e.code === 'ENODATA') message = 'Nenhum registro CNAME encontrado.';
    else message = e.message || 'Erro ao consultar DNS.';
  }
  // Fallback: se o domínio responde HTTP/HTTPS, considera OK (útil com Cloudflare proxy, ALIAS, etc.)
  if (!propagated) {
    try {
      const fetchUrl = 'https://' + domain;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' } });
      clearTimeout(t);
      if (resp.ok || resp.status === 301 || resp.status === 302) {
        propagated = true;
        message = 'Domínio acessível e respondendo. Tudo certo (CNAME pode variar com proxy).';
      }
    } catch (_) {}
  }
  if (!propagated && !message) message = 'Pode levar alguns minutos até 48h para propagar. Verifique os registros no seu provedor de DNS.';
  return res.json({ domain, expectedTarget, resolved, propagated, message });
});

// Debug: resposta bruta do Railway (só admin) – para inspecionar se status.dnsRecords vem na listagem
router.get('/api/domains/railway-raw', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const result = await fetchRailwayDomainsWithRecords();
  res.json({ ok: result.ok, error: result.error, domains: result.domains, count: (result.domains || []).length });
});

// Sincronizar registros DNS (CNAME + TXT) do Railway: atualiza existentes e cria no painel os que só existem no Railway
router.post('/api/domains/sync-railway', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const result = await fetchRailwayDomainsWithRecords();
  if (!result.ok) return res.status(400).json({ error: result.error || 'Erro ao consultar Railway.' });
  const projectId = process.env.RAILWAY_PROJECT_ID;
  const adminId = req.session.userId;
  let updated = 0;
  let created = 0;
  for (const rd of result.domains || []) {
    const domainName = (rd.domain || rd.name || '').toLowerCase().trim();
    if (!domainName) continue;
    // A listagem só retorna CNAME; domainStatus(id, projectId) pode trazer o TXT
    const statusExtra = await fetchDomainStatusFromRailway(rd.id);
    if (statusExtra && statusExtra.dnsRecords && Array.isArray(statusExtra.dnsRecords)) {
      rd.status = rd.status || {};
      rd.status.dnsRecords = [...(rd.status.dnsRecords || []), ...statusExtra.dnsRecords];
    }
    const { cnameVal, txtVal } = parseDnsRecordsFromRailway(rd);
    let row = await db.get('SELECT id FROM allowed_domains WHERE LOWER(domain) = ?', [domainName]);
    if (!row) {
      await db.run('INSERT INTO allowed_domains (user_id, domain, description, railway_cname_target, railway_txt_verify) VALUES (?, ?, ?, ?, ?)',
        [adminId, domainName, 'Sincronizado do Railway', cnameVal || null, txtVal || null]);
      row = await db.get('SELECT id FROM allowed_domains WHERE LOWER(domain) = ? ORDER BY id DESC LIMIT 1', [domainName]);
      if (row) created++;
    }
    if (row && (cnameVal || txtVal)) {
      await db.run('UPDATE allowed_domains SET railway_cname_target = COALESCE(?, railway_cname_target), railway_txt_verify = COALESCE(?, railway_txt_verify) WHERE id = ?', [cnameVal, txtVal, row.id]);
      updated++;
    }
  }
  res.json({ success: true, updated, created, total: (result.domains || []).length });
});

router.patch('/api/domains/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
  const canEdit = user && (user.role === 'admin' || (await db.get('SELECT 1 FROM allowed_domains WHERE id = ? AND user_id = ?', [req.params.id, userId])));
  if (!canEdit) return res.status(403).json({ error: 'Acesso negado' });
  const { railway_txt_verify } = req.body || {};
  if (railway_txt_verify !== undefined) {
    await db.run('UPDATE allowed_domains SET railway_txt_verify = ? WHERE id = ?', [railway_txt_verify ? String(railway_txt_verify).trim() || null : null, req.params.id]);
  }
  const row = await db.get('SELECT id, domain, description, created_at, railway_cname_target, railway_txt_verify FROM allowed_domains WHERE id = ?', [req.params.id]);
  res.json({ success: true, domain: row });
});

router.post('/api/domains/:id/railway', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Só admin publica no Railway' });
  const row = await db.get('SELECT id, domain FROM allowed_domains WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Domínio não encontrado' });
  const railway = await addCustomDomainToRailway(row.domain);
  if (!railway.ok && !/already|exists|duplicate/i.test(railway.error || '')) {
    return res.status(400).json({ error: railway.error || 'Não foi possível publicar no Railway' });
  }
  const refreshed = await refreshDomainDnsFromRailway(row.domain);
  res.json({
    success: true,
    on_railway: true,
    railway_cname_target: refreshed.cnameVal || null,
    railway_txt_verify: refreshed.txtVal || null,
    message: refreshed.txtVal
      ? 'Publicado no Railway. CNAME e TXT estão na tabela.'
      : 'Publicado no Railway. Sincronize de novo se o TXT ainda não aparecer.'
  });
});

router.delete('/api/domains/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
  const canDelete = user && (user.role === 'admin' || (await db.get('SELECT 1 FROM allowed_domains WHERE id = ? AND user_id = ?', [req.params.id, userId])));
  if (!canDelete) return res.status(403).json({ error: 'Acesso negado' });
  const row = await db.get('SELECT domain FROM allowed_domains WHERE id = ?', [req.params.id]);
  let railwayState = 'panel_only';
  let railwayError = null;
  if (user.role === 'admin' && row && row.domain) {
    const out = await removeCustomDomainFromRailway(row.domain);
    railwayState = (out && out.state) || (out && out.ok ? 'removed' : 'failed');
    railwayError = out && out.error ? out.error : null;
    if (railwayState === 'failed') {
      console.error('[Domains] Railway delete:', row.domain, railwayError);
      return res.status(409).json({
        success: false,
        railwayState,
        railwayError,
        message: 'Não apaguei no painel. O domínio continua aqui e no Railway: ' + (railwayError || 'erro ao remover.')
      });
    }
  }
  await db.run('DELETE FROM allowed_domains WHERE id = ?', [req.params.id]);
  const railwayRemoved = railwayState === 'removed';
  res.json({ success: true, railwayRemoved, railwayState, railwayError });
});

  return router;
}

module.exports = { createDomainRoutes };
