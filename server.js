const express = require('express');
const cors = require('cors');
const UAParser = require('ua-parser-js');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dns = require('dns').promises;
const https = require('https');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'cloaker-pro-secret-change-in-production';
const isProduction = process.env.NODE_ENV === 'production';

// Sessão em PostgreSQL quando DATABASE_URL existe (múltiplas réplicas compartilham o mesmo login)
let sessionStore = undefined;
if (process.env.DATABASE_URL) {
  try {
    const pg = require('pg');
    const connectPgSimple = require('connect-pg-simple');
    const PgSession = connectPgSimple(session);
    const sessionPool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    sessionStore = new PgSession({ pool: sessionPool, createTableIfMissing: true });
  } catch (e) {
    console.warn('Session store PG não disponível, usando memória:', e.message);
  }
}

// Brasília (America/Sao_Paulo = UTC-3) – retorna { start, end } em formato SQLite 'YYYY-MM-DD HH:MM:SS' (UTC)
// para comparação com created_at (datetime('now') no SQLite usa esse formato)
function getBrasiliaDateRange(period) {
  const toSqliteUtc = (d) => {
    const y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), day = String(d.getUTCDate()).padStart(2, '0');
    const h = String(d.getUTCHours()).padStart(2, '0'), min = String(d.getUTCMinutes()).padStart(2, '0'), s = String(d.getUTCSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}:${s}`;
  };
  const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;
  const now = new Date();
  const brNow = new Date(now.getTime() + TZ_OFFSET_MS);
  const brDateStr = brNow.toISOString().slice(0, 10);
  const startToday = new Date(brDateStr + 'T03:00:00.000Z');
  const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

  switch (period) {
    case 'today':
      return { start: toSqliteUtc(startToday), end: toSqliteUtc(endToday) };
    case 'yesterday': {
      const prevStart = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);
      return { start: toSqliteUtc(prevStart), end: toSqliteUtc(startToday) };
    }
    case '7d':
      return { start: toSqliteUtc(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), end: toSqliteUtc(endToday) };
    case '15d':
      return { start: toSqliteUtc(new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)), end: toSqliteUtc(endToday) };
    case '30d':
      return { start: toSqliteUtc(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)), end: toSqliteUtc(endToday) };
    default:
      return { start: toSqliteUtc(startToday), end: toSqliteUtc(endToday) };
  }
}
// Railway: atrás de proxy HTTPS – precisa confiar no proxy para cookie e sessão
if (isProduction) app.set('trust proxy', 1);

// Só um domínio pode acessar o painel; os outros servem apenas /go/ e /t/ (links gerados)
const PANEL_DOMAIN = (process.env.PANEL_DOMAIN || '').trim().toLowerCase().replace(/^https?:\/\//, '').split(/[/:]/)[0];
function isPanelRoute(path, method) {
  if (path.startsWith('/go/') || path.startsWith('/r/') || path.startsWith('/l/') || path.startsWith('/v/') || path.startsWith('/t/')) return false;
  if (method === 'GET' && path.match(/^\/api\/config\/[^/]+$/)) return false;
  return true;
}
// Em domínios que não são o do painel: não redirecionar para o painel; mostrar página em manutenção.
// Assim quem acessar só o domínio (ex.: https://iniictranfi.sbs/) não vê nada útil — só /go/ e /t/ funcionam.
const MAINTENANCE_HTML = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página indisponível</title><style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#94a3b8;margin:0;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;}h1{font-size:1.25rem;color:#e2e8f0;}</style></head><body><div><h1>Página indisponível</h1><p>Este endereço não está em uso no momento.</p></div></body></html>';
app.use((req, res, next) => {
  if (!PANEL_DOMAIN) return next();
  const host = (req.hostname || (req.get('host') || '').split(':')[0] || '').toLowerCase();
  if (!isPanelRoute(req.path, req.method)) return next(); // /go/, /t/, api/config: qualquer domínio
  if (host === PANEL_DOMAIN) return next();
  res.status(503).setHeader('Content-Type', 'text/html; charset=utf-8').send(MAINTENANCE_HTML);
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
const sessionOpts = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sid',
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
};
if (sessionStore) sessionOpts.store = sessionStore;
app.use(session(sessionOpts));
app.use(express.static('public'));

// Autenticação: exige sessão para / e /api/* (exceto login, setup, config, go, t)
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path === '/login' || req.path.startsWith('/go/') || req.path.startsWith('/r/') || req.path.startsWith('/l/') || req.path.startsWith('/v/') || req.path.startsWith('/t/')) return next();
  if (req.path === '/api/login' || req.path === '/api/logout' || req.path === '/api/setup' || req.path === '/api/config/') return next();
  if (req.path.startsWith('/api/') && req.method === 'GET' && req.path === '/api/config/' + (req.params && req.params.siteId ? req.params.siteId : '')) return next();
  if (req.path.startsWith('/api/')) {
    if (req.path === '/api/login' || req.path === '/api/setup') return next();
    return res.status(401).json({ error: 'Não autorizado' });
  }
  return res.redirect('/login');
}

async function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

app.use((req, res, next) => {
  if (req.path === '/login' && req.method === 'GET') return next();
  if (req.path.startsWith('/go/') || req.path.startsWith('/r/') || req.path.startsWith('/l/') || req.path.startsWith('/v/') || req.path.startsWith('/t/')) return next();
  if (req.path.match(/^\/api\/config\//) && req.method === 'GET') return next();
  if (req.path === '/' && req.method === 'GET' && (!req.session || !req.session.userId)) return res.redirect('/login');
  if (req.path === '/api/login' || req.path === '/api/setup' || req.path === '/api/setup/check' || req.path === '/api/setup/promote-first-admin' || req.path === '/api/signup') return next();
  if (req.path.startsWith('/api/') && !req.session?.userId) return res.status(401).json({ error: 'Não autorizado' });
  next();
});

// Página de login
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// API: Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
  const user = await db.get('SELECT id, username, role, status, password_hash FROM users WHERE username = ?', [username.trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
  const status = user.status || 'active';
  if (status === 'pending') return res.status(403).json({ error: 'Conta aguardando aprovação do administrador.' });
  if (status === 'banned') return res.status(403).json({ error: 'Conta bloqueada pelo administrador.' });
  if (status === 'paused') return res.status(403).json({ error: 'Conta pausada. Entre em contato com o administrador.' });
  if (status !== 'active') return res.status(403).json({ error: 'Conta inativa.' });
  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Erro ao salvar sessão' });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
  });
});

// API: Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

// API: Usuário atual
app.get('/api/me', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.session.userId]);
  if (!user) return res.status(401).json({ error: 'Não autorizado' });
  res.json(user);
});

// API: Verificar se precisa de setup (sem auth)
app.get('/api/setup/check', async (req, res) => {
  const count = await db.get('SELECT COUNT(*) as c FROM users');
  res.json({ setupRequired: !count || count.c === 0 });
});

// API: Setup inicial (criar primeiro admin se não existir usuários)
app.post('/api/setup', async (req, res) => {
  const count = await db.get('SELECT COUNT(*) as c FROM users');
  if (count && count.c > 0) return res.status(400).json({ error: 'Sistema já configurado' });
  const { username, password } = req.body || {};
  if (!username || !password || username.length < 2 || password.length < 6) return res.status(400).json({ error: 'Usuário (mín. 2 caracteres) e senha (mín. 6 caracteres) obrigatórios' });
  const hash = bcrypt.hashSync(password.trim(), 10);
  await db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username.trim(), hash, 'admin']);
  const user = await db.get('SELECT id, username, role FROM users WHERE username = ?', [username.trim()]);
  req.session.userId = user.id;
  req.session.userRole = user.role;
  res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
});

// API: Recuperação – promover primeiro usuário a admin (quando não há admin e usuário criou conta por "Solicitar acesso")
// Use apenas quando estiver travado (conta pendente e nenhum admin). Requer token em SETUP_RECOVERY_TOKEN.
app.get('/api/setup/promote-first-admin', async (req, res) => {
  const token = req.query.token || (req.body && req.body.token);
  const secret = process.env.SETUP_RECOVERY_TOKEN;
  if (!secret || token !== secret) return res.status(403).json({ error: 'Token inválido ou não configurado.' });
  const adminCount = await db.get('SELECT COUNT(*) as c FROM users WHERE role = ?', ['admin']);
  if (adminCount && adminCount.c > 0) return res.status(400).json({ error: 'Já existe um administrador. Use o painel para aprovar usuários.' });
  const first = await db.get('SELECT id, username FROM users ORDER BY id ASC LIMIT 1');
  if (!first) return res.status(404).json({ error: 'Nenhum usuário no banco.' });
  await db.run('UPDATE users SET role = ?, status = ? WHERE id = ?', ['admin', 'active', first.id]);
  res.json({ success: true, message: 'Primeiro usuário promovido a administrador. Faça login com: ' + first.username });
});

// API: Configurações (domínio do cloaker – por usuário: cada user tem seu próprio domínio)
app.get('/api/settings', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT cloaker_base_url, cloaker_path FROM users WHERE id = ?', [req.session.userId]);
  const path = (user && user.cloaker_path) ? String(user.cloaker_path).toLowerCase() : 'go';
  const validPath = ['go', 'r', 'l', 'v'].includes(path) ? path : 'go';
  res.json({
    cloaker_base_url: (user && user.cloaker_base_url) ? user.cloaker_base_url : '',
    cloaker_path: validPath
  });
});

app.put('/api/settings', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { cloaker_base_url, cloaker_path } = req.body || {};
  const val = (cloaker_base_url != null ? String(cloaker_base_url).trim() : '') || '';
  const path = (cloaker_path != null ? String(cloaker_path).toLowerCase() : 'go').replace(/[^a-z]/g, '') || 'go';
  const validPath = ['go', 'r', 'l', 'v'].includes(path) ? path : 'go';
  await db.run('UPDATE users SET cloaker_base_url = ?, cloaker_path = ? WHERE id = ?', [val, validPath, req.session.userId]);
  res.json({ success: true });
});

// API: Verificar propagação DNS e se o domínio responde (Configurações)
app.get('/api/settings/check-propagation', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  let url = (req.query.url || '').trim();
  if (!url) {
    const user = await db.get('SELECT cloaker_base_url FROM users WHERE id = ?', [req.session.userId]);
    url = (user && user.cloaker_base_url) ? user.cloaker_base_url.trim() : '';
  }
  if (!url) return res.status(400).json({ ok: false, message: 'Informe uma URL em "Meu domínio do Cloaker" e salve, ou passe ?url= na consulta.', details: {} });

  let hostname;
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    hostname = u.hostname;
    if (!hostname) throw new Error('Host inválido');
  } catch (e) {
    return res.json({ ok: false, message: 'URL inválida. Use algo como https://energysaver.store', details: {} });
  }

  const details = { hostname, resolved: false, cname: [], ips: [], reachable: false };

  try {
    try {
      const cnames = await dns.resolveCname(hostname);
      details.cname = Array.isArray(cnames) ? cnames : [cnames];
      details.resolved = true;
    } catch (e) {
      try {
        const ips = await dns.resolve4(hostname);
        details.ips = ips || [];
        details.resolved = details.ips.length > 0;
      } catch (e2) {
        details.resolved = false;
      }
    }

    const fetchUrl = url.startsWith('http') ? url : 'https://' + url;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const resp = await fetch(fetchUrl, { method: 'GET', redirect: 'follow', signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } });
      clearTimeout(timeout);
      details.reachable = resp.ok || resp.status === 302 || resp.status === 301;
    } catch (e) {
      clearTimeout(timeout);
      details.reachable = false;
    }
  } catch (e) {
    console.error('Check propagation error:', e.message);
  }

  const ok = details.reachable || (details.resolved && (details.cname.length > 0 || details.ips.length > 0));
  let message;
  if (details.reachable) message = 'Domínio está propagado e respondendo. Tudo certo.';
  else if (details.resolved) message = 'DNS resolveu, mas o domínio ainda não está respondendo. Pode ser propagação em andamento ou SSL/proxy. Tente de novo em alguns minutos.';
  else message = 'Domínio ainda não resolveu (propagação em andamento ou CNAME incorreto). Aguarde alguns minutos ou confira o registro no seu DNS.';

  res.json({ ok, message, details });
});

// API: Solicitar conta (público – cria usuário com status pending)
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || username.trim().length < 2 || password.length < 6) return res.status(400).json({ error: 'Usuário (mín. 2 caracteres) e senha (mín. 6 caracteres) obrigatórios' });
  const exists = await db.get('SELECT id FROM users WHERE username = ?', [username.trim()]);
  if (exists) return res.status(400).json({ error: 'Este usuário já está cadastrado.' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    await db.run('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [username.trim(), hash, 'user', 'pending']);
    res.json({ success: true, message: 'Solicitação enviada. Aguarde a aprovação do administrador.' });
  } catch (e) {
    res.status(400).json({ error: 'Erro ao solicitar conta.' });
  }
});

// API: Listar usuários (admin – ativos e pendentes)
app.get('/api/users', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const users = await db.all('SELECT id, username, role, status, created_at FROM users ORDER BY status ASC, created_at DESC');
  res.json(users);
});

// API: Aprovar usuário (admin)
app.post('/api/users/:id/approve', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  await db.run('UPDATE users SET status = ? WHERE id = ?', ['active', id]);
  const u = await db.get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [id]);
  res.json(u || { success: true });
});

// API: Rejeitar/remover solicitação (admin)
app.post('/api/users/:id/reject', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  await db.run('DELETE FROM users WHERE id = ? AND status = ?', [id, 'pending']);
  res.json({ success: true });
});

// API: Excluir usuário (admin) – remove usuário e seus sites/visitantes
app.delete('/api/users/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  if (id === req.session.userId) return res.status(400).json({ error: 'Você não pode excluir sua própria conta.' });
  const user = await db.get('SELECT id FROM users WHERE id = ?', [id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  const rows = await db.all('SELECT site_id FROM sites WHERE user_id = ?', [id]);
  const siteIds = (rows || []).map(r => r.site_id);
  for (const sid of siteIds) {
    await db.run('DELETE FROM visitors WHERE site_id = ?', [sid]);
    await db.run('DELETE FROM sites WHERE site_id = ?', [sid]);
  }
  await db.run('DELETE FROM users WHERE id = ?', [id]);
  res.json({ success: true });
});

// API: Banir usuário (admin) – status = banned (não pode fazer login)
app.post('/api/users/:id/ban', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  if (id === req.session.userId) return res.status(400).json({ error: 'Você não pode banir sua própria conta.' });
  await db.run('UPDATE users SET status = ? WHERE id = ?', ['banned', id]);
  const u = await db.get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [id]);
  res.json(u || { success: true });
});

// API: Pausar usuário (admin) – status = paused
app.post('/api/users/:id/pause', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  if (id === req.session.userId) return res.status(400).json({ error: 'Você não pode pausar sua própria conta.' });
  await db.run('UPDATE users SET status = ? WHERE id = ?', ['paused', id]);
  const u = await db.get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [id]);
  res.json(u || { success: true });
});

// API: Ativar usuário (admin) – status = active
app.post('/api/users/:id/activate', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'ID inválido' });
  await db.run('UPDATE users SET status = ? WHERE id = ?', ['active', id]);
  const u = await db.get('SELECT id, username, role, status, created_at FROM users WHERE id = ?', [id]);
  res.json(u || { success: true });
});

// API: Alterar senha do usuário atual
app.put('/api/me/password', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Senha atual e nova senha (mín. 6 caracteres) obrigatórias.' });
  const user = await db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Senha atual incorreta.' });
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
  res.json({ success: true });
});

// API: Alterar username do usuário atual
app.put('/api/me/username', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { username } = req.body || {};
  if (!username || username.trim().length < 2) return res.status(400).json({ error: 'Usuário com pelo menos 2 caracteres obrigatório.' });
  const exists = await db.get('SELECT id FROM users WHERE username = ? AND id != ?', [username.trim(), req.session.userId]);
  if (exists) return res.status(400).json({ error: 'Este usuário já está em uso.' });
  await db.run('UPDATE users SET username = ? WHERE id = ?', [username.trim(), req.session.userId]);
  res.json({ success: true });
});

// API: Alterar senha do usuário (admin)
app.put('/api/users/:id/password', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const id = parseInt(req.params.id, 10);
  const { password } = req.body || {};
  if (!id || !password || password.length < 6) return res.status(400).json({ error: 'Senha com pelo menos 6 caracteres obrigatória.' });
  const hash = bcrypt.hashSync(password, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
  res.json({ success: true });
});

// API: Criar usuário (admin – já ativo)
app.post('/api/users', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const admin = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!admin || admin.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { username, password, role } = req.body || {};
  if (!username || !password || username.trim().length < 2 || password.length < 6) return res.status(400).json({ error: 'Usuário (mín. 2 caracteres) e senha (mín. 6 caracteres) obrigatórios' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    await db.run('INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)', [username.trim(), hash, role === 'admin' ? 'admin' : 'user', 'active']);
    const u = await db.get('SELECT id, username, role, status, created_at FROM users WHERE username = ?', [username.trim()]);
    res.json(u);
  } catch (e) {
    res.status(400).json({ error: 'Usuário já existe' });
  }
});

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
  if (!token || !serviceId || !projectId || !environmentId) return Promise.resolve({ ok: false });

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
      return { ok: false, error: json.errors[0].message };
    }
    const domainsData = json.data && json.data.domains;
    let custom = (domainsData && (domainsData.customDomains || domainsData.custom_domains)) || [];
    if (Array.isArray(custom) && custom.length && custom[0].node) custom = custom.map(e => e.node);
    const d = domain.trim().toLowerCase();
    const found = custom.find(c => ((c.domain || c.name || '').toLowerCase()) === d);
    if (!found || !(found.id || found.customDomainId)) return { ok: true };
    const idToDelete = found.id || found.customDomainId;
    const deleteBody = JSON.stringify({
      query: 'mutation CustomDomainDelete($id: String!, $projectId: String!) { customDomainDelete(id: $id, projectId: $projectId) { id } }',
      variables: { id: idToDelete, projectId }
    });
    return graphql(deleteBody).then(del => {
      if (del.errors && del.errors.length) {
        console.error('[Railway] customDomainDelete falhou:', del.errors[0].message);
        return { ok: false, error: del.errors[0].message };
      }
      return { ok: true };
    });
  }).catch(e => {
    console.error('[Railway] removeCustomDomainFromRailway:', e.message);
    return { ok: false, error: e.message };
  });
}

// API: Domínios do usuário logado – listar, criar, excluir. Qualquer usuário gerencia seus domínios.
app.get('/api/domains', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const list = await db.all('SELECT id, domain, description, created_at, railway_cname_target FROM allowed_domains WHERE user_id = ? OR user_id IS NULL ORDER BY domain ASC', [userId]);
  const cnameTarget = getCnameTarget(req);
  res.json({ domains: list, cnameTarget });
});

app.post('/api/domains', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const { domain, description } = req.body || {};
  const d = (domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
  if (!d) return res.status(400).json({ error: 'Informe o domínio' });
  try {
    await db.run('INSERT INTO allowed_domains (user_id, domain, description) VALUES (?, ?, ?)', [userId, d, (description || '').trim() || null]);
    let row = await db.get('SELECT id, domain, description, created_at, railway_cname_target FROM allowed_domains WHERE user_id = ? AND domain = ? ORDER BY id DESC LIMIT 1', [userId, d]);
    const payload = row || { id: 0, domain: d, description: (description || '').trim() || null, created_at: new Date().toISOString(), railway_cname_target: null };
    const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
    const isAdmin = user && user.role === 'admin';
    if (isAdmin) {
      const railway = await addCustomDomainToRailway(d);
      if (railway.ok) {
        let cnameValue = null;
        const dnsRecords = railway.data && railway.data.status && railway.data.status.dnsRecords;
        if (Array.isArray(dnsRecords) && dnsRecords.length) {
          const cnameRecord = dnsRecords.find(r => (r.recordType || r.record_type || '').toUpperCase() === 'CNAME') || dnsRecords[0];
          const val = cnameRecord && (cnameRecord.requiredValue || cnameRecord.required_value);
          cnameValue = (typeof val === 'string' && val.trim()) ? val.trim() : null;
        }
        if (cnameValue && payload.id) {
          await db.run('UPDATE allowed_domains SET railway_cname_target = ? WHERE id = ?', [cnameValue, payload.id]);
          payload.railway_cname_target = cnameValue;
        }
        payload.nextStep = 'Domínio cadastrado no painel e no Railway. As configurações DNS deste domínio aparecem na tabela abaixo — use o Valor CNAME na coluna do domínio no seu provedor de DNS. Você pode verificar propagação com o botão "Verificar".';
        payload.railwaySynced = true;
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
    } else {
      payload.nextStep = 'Domínio cadastrado. Use a tabela "Configuração DNS" na seção Domínios no seu provedor de DNS. Um admin pode configurar as variáveis Railway para que novos domínios sejam adicionados automaticamente no Railway.';
    }
    res.json(payload);
  } catch (e) {
    res.status(400).json({ error: 'Domínio já cadastrado para você' });
  }
});

// Verificar se o DNS do domínio já propagou (CNAME aponta para o target esperado).
app.get('/api/domains/check-dns', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const domain = (req.query.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  if (!domain) return res.status(400).json({ error: 'Informe o parâmetro domain' });
  const expectedTarget = (req.query.target || '').trim() || getCnameTarget(req);
  if (!expectedTarget) return res.status(400).json({ error: 'Destino CNAME não definido' });
  try {
    const cname = await dns.resolve(domain, 'CNAME').catch(() => []);
    const resolved = Array.isArray(cname) && cname.length ? cname[0].replace(/\.$/, '') : null;
    const propagated = !!resolved && resolved.toLowerCase() === expectedTarget.toLowerCase();
    return res.json({
      domain,
      expectedTarget,
      resolved: resolved || null,
      propagated,
      message: propagated
        ? 'DNS propagado. O domínio está apontando corretamente para o servidor.'
        : (resolved ? `O domínio aponta para ${resolved}. O esperado é ${expectedTarget}.` : 'Ainda não encontramos registro CNAME para este domínio. Pode levar alguns minutos até 48h.')
    });
  } catch (e) {
    return res.json({
      domain,
      expectedTarget,
      resolved: null,
      propagated: false,
      message: e.code === 'ENODATA' ? 'Nenhum registro CNAME encontrado para este domínio. Configure no seu provedor de DNS.' : (e.message || 'Erro ao consultar DNS.')
    });
  }
});

app.delete('/api/domains/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const user = await db.get('SELECT role FROM users WHERE id = ?', [userId]);
  const canDelete = user && (user.role === 'admin' || (await db.get('SELECT 1 FROM allowed_domains WHERE id = ? AND user_id = ?', [req.params.id, userId])));
  if (!canDelete) return res.status(403).json({ error: 'Acesso negado' });
  const row = await db.get('SELECT domain FROM allowed_domains WHERE id = ?', [req.params.id]);
  if (user.role === 'admin' && row && row.domain) {
    await removeCustomDomainFromRailway(row.domain);
  }
  await db.run('DELETE FROM allowed_domains WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// API: Backup do banco (admin) – exporta dados para não perder
async function exportBackup() {
  return {
    exportedAt: new Date().toISOString(),
    users: await db.all('SELECT * FROM users'),
    sites: await db.all('SELECT * FROM sites'),
    visitors: await db.all('SELECT id, site_id, ip, country, city, region, device_type, browser, os, was_blocked, block_reason, is_bot, created_at FROM visitors'),
    allowed_domains: await db.all('SELECT * FROM allowed_domains'),
    settings: await db.all('SELECT * FROM settings')
  };
}

app.get('/api/backup', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  res.setHeader('Content-Disposition', 'attachment; filename=cloaker-backup-' + new Date().toISOString().slice(0, 10) + '.json');
  res.json(await exportBackup());
});

app.post('/api/backup/send', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const url = process.env.BACKUP_WEBHOOK_URL || '';
  if (!url.trim()) return res.status(400).json({ error: 'Configure BACKUP_WEBHOOK_URL no Railway' });
  const payload = await exportBackup();
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(() => {}).catch(() => {});
  res.json({ success: true, message: 'Backup enviado para o webhook' });
});

// Envio automático de backup a cada 6 horas se BACKUP_WEBHOOK_URL estiver definido
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000;
if (process.env.BACKUP_WEBHOOK_URL) {
  setInterval(() => {
    exportBackup().then(payload => {
      fetch(process.env.BACKUP_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    }).catch(() => {});
  }, BACKUP_INTERVAL_MS);
}

// Rate limit para /api/config (proteção contra crawlers)
const configRateLimit = new Map();
const CONFIG_RATE_LIMIT_WINDOW = 60000; // 1 min
const CONFIG_RATE_LIMIT_MAX = 60; // req/min por IP
function checkConfigRateLimit(ip) {
  const now = Date.now();
  let entry = configRateLimit.get(ip);
  if (!entry) { entry = { count: 0, resetAt: now + CONFIG_RATE_LIMIT_WINDOW }; configRateLimit.set(ip, entry); }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + CONFIG_RATE_LIMIT_WINDOW; }
  entry.count++;
  if (entry.count > CONFIG_RATE_LIMIT_MAX) return false;
  return true;
}

// API: Buscar configurações do site (para o script) – protegido contra scraping
app.get('/api/config/:siteId', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';
  if (!ua || ua.length < 10) return res.status(403).json({ error: 'Forbidden' });
  if (!checkConfigRateLimit(ip)) return res.status(429).json({ error: 'Too many requests' });
  const site = await db.get('SELECT * FROM sites WHERE site_id = ? AND is_active = 1', [req.params.siteId]);
  if (!site) {
    return res.json({
      redirect_url: 'https://www.google.com/',
      block_desktop: 1,
      block_facebook_library: 1,
      block_bots: 1,
      block_devtools: 1,
      allowed_countries: 'BR',
      blocked_countries: ''
    });
  }
  res.json(site);
});

// API: Registrar visita
app.post('/api/track', async (req, res) => {
  try {
    const data = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    
    const parser = new UAParser(data.userAgent);
    const ua = parser.getResult();

    const sql = `
      INSERT INTO visitors (
        site_id, visitor_id, ip, country, city, region, isp, timezone,
        user_agent, browser, browser_version, os, os_version,
        device_type, device_vendor, device_model,
        screen_width, screen_height, viewport_width, viewport_height,
        color_depth, pixel_ratio, language, languages, platform,
        cookies_enabled, do_not_track, online, touch_support, max_touch_points,
        hardware_concurrency, device_memory, connection_type, connection_speed,
        referrer, page_url, page_title,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content,
        facebook_params, is_bot, bot_reason, was_blocked, block_reason,
        webgl_vendor, webgl_renderer, canvas_fingerprint, audio_fingerprint,
        fonts_detected, plugins, battery_level, battery_charging,
        local_storage, session_storage, indexed_db, ad_blocker, webrtc_leak, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, datetime('now')
      )
    `;

    await db.run(sql, [
      data.siteId || 'default',
      data.visitorId || null,
      ip,
      data.geo?.country || null,
      data.geo?.city || null,
      data.geo?.region || null,
      data.geo?.isp || null,
      data.timezone || null,
      data.userAgent || null,
      ua.browser?.name || null,
      ua.browser?.version || null,
      ua.os?.name || null,
      ua.os?.version || null,
      ua.device?.type || 'desktop',
      ua.device?.vendor || null,
      ua.device?.model || null,
      data.screen?.width || null,
      data.screen?.height || null,
      data.viewport?.width || null,
      data.viewport?.height || null,
      data.screen?.colorDepth || null,
      data.screen?.pixelRatio || null,
      data.language || null,
      JSON.stringify(data.languages || []),
      data.platform || null,
      data.cookiesEnabled ? 1 : 0,
      data.doNotTrack ? 1 : 0,
      data.online ? 1 : 0,
      data.touchSupport ? 1 : 0,
      data.maxTouchPoints || 0,
      data.hardwareConcurrency || null,
      data.deviceMemory || null,
      data.connection?.type || null,
      data.connection?.effectiveType || null,
      data.referrer || null,
      data.pageUrl || null,
      data.pageTitle || null,
      data.utm?.source || null,
      data.utm?.medium || null,
      data.utm?.campaign || null,
      data.utm?.term || null,
      data.utm?.content || null,
      JSON.stringify(data.facebookParams || {}),
      data.isBot ? 1 : 0,
      data.botReason || null,
      data.wasBlocked ? 1 : 0,
      data.blockReason || null,
      data.webgl?.vendor || null,
      data.webgl?.renderer || null,
      data.fingerprints?.canvas || null,
      data.fingerprints?.audio || null,
      JSON.stringify(data.fonts || []),
      JSON.stringify(data.plugins || []),
      data.battery?.level || null,
      data.battery?.charging ? 1 : 0,
      data.storage?.localStorage ? 1 : 0,
      data.storage?.sessionStorage ? 1 : 0,
      data.storage?.indexedDB ? 1 : 0,
      data.adBlocker ? 1 : 0,
      data.webrtcLeak || null
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar visita:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: IDs dos sites do usuário logado (cada usuário vê só seus sites)
async function getMySiteIds(userId) {
  const rows = await db.all('SELECT site_id FROM sites WHERE user_id = ?', [userId]);
  return rows.map(r => r.site_id).filter(Boolean);
}

// API: Listar sites (apenas do usuário logado)
app.get('/api/sites', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const sites = await db.all(`
    SELECT s.*, 
           (SELECT COUNT(*) FROM visitors WHERE site_id = s.site_id) as total_visits,
           (SELECT COUNT(*) FROM visitors WHERE site_id = s.site_id AND was_blocked = 1) as blocked_visits
    FROM sites s 
    WHERE s.user_id = ?
    ORDER BY s.created_at DESC
  `, [userId]);
  res.json(sites);
});

async function generateLinkCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  if (await db.get('SELECT 1 FROM sites WHERE link_code = ?', [code])) return generateLinkCode();
  return code;
}

function generateRefToken() {
  return crypto.randomBytes(10).toString('hex');
}

// API: Criar site (padrão: apenas Brasil; gera link para usar nos Ads) – pertence ao usuário logado
app.post('/api/sites', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { name, domain, target_url, redirect_url, allowed_countries, block_behavior, landing_page_id, selected_domain } = req.body;
  const siteId = 'site_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const linkCode = await generateLinkCode();
  const refToken = generateRefToken();
  const countries = allowed_countries !== undefined ? allowed_countries : 'BR';
  const target = (target_url || '').trim() || null;
  const userId = req.session.userId;
  const behavior = block_behavior === 'page' ? 'page' : (block_behavior === 'embed' ? 'embed' : 'redirect');
  const lpId = behavior === 'page' && landing_page_id ? parseInt(landing_page_id, 10) : null;
  const selDomain = (selected_domain || '').trim() || null;
  try {
    const defaultParams = (req.body.default_link_params || '').trim() || null;
    await db.run(`INSERT INTO sites (site_id, link_code, user_id, name, domain, target_url, redirect_url, block_behavior, default_link_params, allowed_countries, block_desktop, block_facebook_library, block_bots, block_vpn, block_devtools, required_ref_token, landing_page_id, selected_domain, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1, 1, 1, ?, ?, ?, datetime('now'))`,
      [siteId, linkCode, userId, name, domain, target, redirect_url || 'https://www.google.com/', behavior, defaultParams, countries, refToken, lpId, selDomain]);
    const site = await db.get('SELECT * FROM sites WHERE site_id = ?', [siteId]);
    res.json(site);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Atualizar site (apenas se o site pertencer ao usuário)
app.put('/api/sites/:siteId', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const existing = await db.get('SELECT link_code, user_id, required_ref_token FROM sites WHERE site_id = ?', [req.params.siteId]);
  if (!existing) return res.status(404).json({ error: 'Site não encontrado' });
  if (existing.user_id != null && Number(existing.user_id) !== Number(req.session.userId)) return res.status(403).json({ error: 'Acesso negado a este site' });
  const data = req.body;
  try {
    let linkCode = existing.link_code;
    if (!linkCode) linkCode = await generateLinkCode();
    let refToken = existing.required_ref_token;
    if (data.regenerate_ref_token) refToken = generateRefToken();
    else if (data.required_ref_token !== undefined) refToken = (data.required_ref_token || '').trim() || null;
    const blockBehavior = data.block_behavior === 'page' ? 'page' : (data.block_behavior === 'embed' ? 'embed' : 'redirect');
    const defaultParams = (data.default_link_params || '').trim() || null;
    const lpId = blockBehavior === 'page' && data.landing_page_id ? parseInt(data.landing_page_id, 10) : null;
    const selDomain = (data.selected_domain || '').trim() || null;
    await db.run(`
      UPDATE sites SET
        name = ?, domain = ?, link_code = ?, target_url = ?, redirect_url = ?, block_behavior = ?, default_link_params = ?,
        block_desktop = ?, block_facebook_library = ?, block_bots = ?,
        block_vpn = ?, block_devtools = ?,
        allowed_countries = ?, blocked_countries = ?, is_active = ?, required_ref_token = ?, selected_domain = ?, landing_page_id = ?
      WHERE site_id = ?
    `, [
      data.name, data.domain, linkCode, (data.target_url || '').trim() || null, data.redirect_url, blockBehavior, defaultParams,
      data.block_desktop ? 1 : 0, data.block_facebook_library ? 1 : 0, data.block_bots ? 1 : 0,
      data.block_vpn ? 1 : 0, data.block_devtools ? 1 : 0,
      data.allowed_countries || '', data.blocked_countries || '', data.is_active ? 1 : 0, refToken,
      selDomain, lpId,
      req.params.siteId
    ]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Atualizar domínio selecionado do site
app.put('/api/sites/:siteId/selected-domain', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const site = await db.get('SELECT user_id FROM sites WHERE site_id = ?', [req.params.siteId]);
  if (!site) return res.status(404).json({ error: 'Site não encontrado' });
  if (site.user_id != null && Number(site.user_id) !== Number(req.session.userId)) return res.status(403).json({ error: 'Acesso negado' });
  const { selected_domain } = req.body || {};
  await db.run('UPDATE sites SET selected_domain = ? WHERE site_id = ?', [(selected_domain || '').trim() || null, req.params.siteId]);
  res.json({ success: true });
});

// ---------- API: Páginas HTML (landing customizadas) ----------
app.get('/api/pages', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const list = await db.all('SELECT id, user_id, name, created_at FROM landing_pages WHERE user_id = ? ORDER BY name', [req.session.userId]);
  res.json(list);
});
app.post('/api/pages', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { name, html_content } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  await db.run('INSERT INTO landing_pages (user_id, name, html_content) VALUES (?, ?, ?)', [req.session.userId, String(name).trim(), String(html_content || '').trim() || null]);
  const row = await db.get('SELECT * FROM landing_pages WHERE user_id = ? ORDER BY id DESC LIMIT 1', [req.session.userId]);
  res.status(201).json(row);
});
app.get('/api/pages/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const row = await db.get('SELECT * FROM landing_pages WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!row) return res.status(404).json({ error: 'Página não encontrada' });
  res.json(row);
});
app.put('/api/pages/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { name, html_content } = req.body || {};
  const existing = await db.get('SELECT id FROM landing_pages WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!existing) return res.status(404).json({ error: 'Página não encontrada' });
  await db.run('UPDATE landing_pages SET name = ?, html_content = ? WHERE id = ?', [String(name ?? '').trim() || null, String(html_content ?? '').trim() || null, req.params.id]);
  const row = await db.get('SELECT * FROM landing_pages WHERE id = ?', [req.params.id]);
  res.json(row);
});
app.delete('/api/pages/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const existing = await db.get('SELECT id FROM landing_pages WHERE id = ? AND user_id = ?', [req.params.id, req.session.userId]);
  if (!existing) return res.status(404).json({ error: 'Página não encontrada' });
  await db.run('DELETE FROM landing_pages WHERE id = ?', [req.params.id]);
  await db.run('UPDATE sites SET landing_page_id = NULL WHERE landing_page_id = ?', [req.params.id]);
  res.json({ success: true });
});

// API: Deletar site (apenas se pertencer ao usuário)
app.delete('/api/sites/:siteId', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const site = await db.get('SELECT user_id FROM sites WHERE site_id = ?', [req.params.siteId]);
  if (!site) return res.status(404).json({ error: 'Site não encontrado' });
  if (site.user_id != null && Number(site.user_id) !== Number(req.session.userId)) return res.status(403).json({ error: 'Acesso negado' });
  try {
    await db.run('DELETE FROM visitors WHERE site_id = ?', [req.params.siteId]);
    await db.run('DELETE FROM sites WHERE site_id = ?', [req.params.siteId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Listar visitantes (apenas dos sites do usuário)
app.get('/api/visitors', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const filter = req.query.filter || 'all';
  const siteId = req.query.site || null;

  let where = ["v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)"];
  const params = [userId];
  if (siteId && siteId !== 'all') {
    const myIds = await getMySiteIds(userId);
    if (!myIds.includes(siteId)) {
      return res.json({ visitors: [], total: 0, page: 1, pages: 0 });
    }
    where.push('v.site_id = ?');
    params.push(siteId);
  }
  if (filter === 'blocked') where.push('v.was_blocked = 1');
  else if (filter === 'allowed') where.push('v.was_blocked = 0');
  else if (filter === 'bots') where.push('v.is_bot = 1');
  else if (filter === 'mobile') where.push("v.device_type IN ('mobile', 'tablet')");
  else if (filter === 'desktop') where.push("(v.device_type = 'desktop' OR v.device_type IS NULL)");

  const whereClause = 'WHERE ' + where.join(' AND ');
  const visitors = await db.all(`SELECT v.* FROM visitors v ${whereClause} ORDER BY v.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params);
  const total = await db.get(`SELECT COUNT(*) as count FROM visitors v ${whereClause}`, params);

  res.json({
    visitors,
    total: total?.count || 0,
    page,
    pages: Math.ceil((total?.count || 0) / limit)
  });
});

// API: Estatísticas (apenas dos sites do usuário) – filtro por horário de Brasília
app.get('/api/stats', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const period = req.query.period || 'today';
  const siteId = req.query.site || null;

  const { start, end } = getBrasiliaDateRange(period);

  const userSites = "v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)";
  const siteFilter = siteId && siteId !== 'all' ? " AND v.site_id = ?" : '';
  const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
  const baseWhere = `FROM visitors v WHERE v.created_at >= ? AND v.created_at < ? AND ${userSites}${siteFilter}`;
  const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";

  const stats = {
    total: (await db.get(`SELECT COUNT(*) as count ${baseWhere}`, params))?.count || 0,
    blocked: (await db.get(`SELECT COUNT(*) as count ${baseWhere} AND v.was_blocked = 1`, params))?.count || 0,
    allowed: (await db.get(`SELECT COUNT(*) as count ${baseWhere} AND v.was_blocked = 0`, params))?.count || 0,
    bots: (await db.get(`SELECT COUNT(*) as count ${baseWhere} AND v.is_bot = 1`, params))?.count || 0,
    mobile: (await db.get(`SELECT COUNT(*) as count ${baseWhere} AND v.device_type IN ('mobile', 'tablet')`, params))?.count || 0,
    desktop: (await db.get(`SELECT COUNT(*) as count ${baseWhere} AND (v.device_type = 'desktop' OR v.device_type IS NULL)`, params))?.count || 0,
    byBrowser: await db.all(`SELECT v.browser as browser, COUNT(*) as count ${baseWhere} AND v.browser IS NOT NULL GROUP BY v.browser ORDER BY count DESC LIMIT 10`, params),
    byOS: await db.all(`SELECT v.os as os, COUNT(*) as count ${baseWhere} AND v.os IS NOT NULL GROUP BY v.os ORDER BY count DESC LIMIT 10`, params),
    byCountry: await db.all(`SELECT v.country as country, COUNT(*) as count ${baseWhere} AND v.country IS NOT NULL GROUP BY v.country ORDER BY count DESC LIMIT 10`, params),
    byReferrer: await db.all(`SELECT v.referrer as referrer, COUNT(*) as count ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY count DESC LIMIT 10`, params),
    byHour: await db.all(`SELECT ${hourExpr} as hour, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed ${baseWhere} GROUP BY hour ORDER BY hour DESC LIMIT 24`, params),
    blockReasons: await db.all(`SELECT v.block_reason as block_reason, COUNT(*) as count ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY count DESC`, params),
    bySite: await db.all(`SELECT v.site_id as site_id, COUNT(*) as count FROM visitors v WHERE v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?) AND v.created_at >= ? AND v.created_at < ? GROUP BY v.site_id ORDER BY count DESC`, [userId, start, end])
  };

  res.json(stats);
});

// API: Detalhes de um visitante (apenas se o visitante for de um site do usuário)
app.get('/api/visitors/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const visitor = await db.get('SELECT v.* FROM visitors v INNER JOIN sites s ON s.site_id = v.site_id AND s.user_id = ? WHERE v.id = ?', [req.session.userId, req.params.id]);
  if (!visitor) return res.status(404).json({ error: 'Visitante não encontrado' });
  res.json(visitor);
});

// API: Deletar visitantes (apenas dos sites do usuário)
app.delete('/api/visitors', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const { ids } = req.body;
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await db.run(`DELETE FROM visitors WHERE id IN (${placeholders}) AND site_id IN (SELECT site_id FROM sites WHERE user_id = ?)`, [...ids, req.session.userId]);
  }
  res.json({ success: true });
});

// API: Limpar todos os dados (apenas visitantes dos sites do usuário)
app.delete('/api/visitors/all', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  await db.run('DELETE FROM visitors WHERE site_id IN (SELECT site_id FROM sites WHERE user_id = ?)', [req.session.userId]);
  res.json({ success: true });
});

// API: Exportar dados com filtros (data, site, apenas bloqueados, etc.)
app.get('/api/export', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const format = req.query.format || 'json';
  const siteId = req.query.site || null;
  const filter = req.query.filter || 'all'; // all, blocked, allowed, bots, suspected_reviewer
  const period = req.query.period || '30d';

  const { start, end } = getBrasiliaDateRange(period);
  let sql = 'SELECT v.* FROM visitors v INNER JOIN sites s ON s.site_id = v.site_id AND s.user_id = ? WHERE v.created_at >= ? AND v.created_at < ?';
  const params = [userId, start, end];
  if (siteId && siteId !== 'all') {
    sql += ' AND v.site_id = ?';
    params.push(siteId);
  }
  if (filter === 'blocked') { sql += ' AND v.was_blocked = 1'; }
  else if (filter === 'allowed') { sql += ' AND v.was_blocked = 0'; }
  else if (filter === 'bots') { sql += ' AND v.is_bot = 1'; }
  else if (filter === 'suspected_reviewer') { sql += ' AND v.is_suspected_reviewer = 1'; }
  sql += ' ORDER BY v.created_at DESC';

  const visitors = await db.all(sql, params);

  if (format === 'csv') {
    if (visitors.length === 0) return res.send('');
    const headers = Object.keys(visitors[0]).join(',');
    const rows = visitors.map(v => Object.values(v).map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=visitors-${period}.csv`);
    res.send('\ufeff' + [headers, ...rows].join('\n')); // BOM para Excel
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=visitors-${period}.json`);
    res.json(visitors);
  }
});

// API: Analytics para dashboard de análise (User-Agents bloqueados, motivos, IPs, etc.)
app.get('/api/analytics', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const userId = req.session.userId;
  const period = req.query.period || '7d';
  const siteId = req.query.site || null;
  const { start, end } = getBrasiliaDateRange(period);
  const siteFilter = siteId && siteId !== 'all' ? ' AND v.site_id = ?' : '';
  const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
  const baseWhere = `v.created_at >= ? AND v.created_at < ? AND v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)${siteFilter}`;

  const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";

  const [
    byUserAgentBlocked,
    byBlockReason,
    byIp,
    byReferrer,
    timeline,
    suspectedReviewers,
    topBots
  ] = await Promise.all([
    db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.user_agent IS NOT NULL GROUP BY v.user_agent ORDER BY c DESC LIMIT 30`, params),
    db.all(`SELECT v.block_reason as reason, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY c DESC`, params),
    db.all(`SELECT v.ip as ip, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.ip != 'unknown' GROUP BY v.ip ORDER BY c DESC LIMIT 20`, params),
    db.all(`SELECT v.referrer as ref, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY c DESC LIMIT 15`, params),
    db.all(`SELECT ${hourExpr} as h, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.is_suspected_reviewer = 1 THEN 1 ELSE 0 END) as reviewers FROM visitors v WHERE ${baseWhere} GROUP BY h ORDER BY h`, params),
    db.all(`SELECT v.ip, v.user_agent, v.referrer, v.block_reason, v.created_at FROM visitors v WHERE ${baseWhere} AND v.is_suspected_reviewer = 1 ORDER BY v.created_at DESC LIMIT 50`, params),
    db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.is_bot = 1 GROUP BY v.user_agent ORDER BY c DESC LIMIT 20`, params)
  ]);

  res.json({
    byUserAgentBlocked: (byUserAgentBlocked || []).map(r => ({ ua: r.ua, count: r.c })),
    byBlockReason: (byBlockReason || []).map(r => ({ reason: r.reason, count: r.c })),
    byIp: (byIp || []).map(r => ({ ip: r.ip, count: r.c })),
    byReferrer: (byReferrer || []).map(r => ({ ref: r.ref, count: r.c })),
    timeline: timeline || [],
    suspectedReviewers: suspectedReviewers || [],
    topBots: (topBots || []).map(r => ({ ua: r.ua, count: r.c }))
  });
});

// API: IPs de revisão do Meta (admin)
app.get('/api/meta-ips', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const list = await db.all('SELECT * FROM meta_reviewer_ips ORDER BY ip_or_cidr');
  res.json(list);
});

app.post('/api/meta-ips', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { ip_or_cidr, description } = req.body || {};
  const val = (ip_or_cidr || '').trim();
  if (!val) return res.status(400).json({ error: 'IP ou CIDR obrigatório' });
  try {
    await db.run('INSERT INTO meta_reviewer_ips (ip_or_cidr, description) VALUES (?, ?)', [val, (description || '').trim() || null]);
    await loadMetaReviewerIPs();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'IP/CIDR já cadastrado' });
  }
});

app.delete('/api/meta-ips/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  await db.run('DELETE FROM meta_reviewer_ips WHERE id = ?', [req.params.id]);
  await loadMetaReviewerIPs();
  res.json({ success: true });
});

// Job de análise automática – roda a cada 6h, aprende padrões e gera sugestões
async function runAutoImprovementJob() {
  try {
    const autoApplyBots = (await db.get("SELECT value FROM settings WHERE key = 'auto_apply_learned_bots'"))?.value === '1';
    const { start } = getBrasiliaDateRange('7d');

    const blocked = await db.all(`SELECT ip, user_agent, referrer, country FROM visitors WHERE was_blocked = 1 AND created_at >= ? AND user_agent IS NOT NULL AND user_agent != ''`, [start]);

    const uaCount = new Map();
    const uaIps = new Map();
    for (const v of blocked || []) {
      const ua = (v.user_agent || '').trim();
      if (!ua || ua.length < 4) continue;
      const key = ua.length > 120 ? ua.substring(0, 120) : ua;
      uaCount.set(key, (uaCount.get(key) || 0) + 1);
      if (!uaIps.has(key)) uaIps.set(key, new Set());
      uaIps.get(key).add(v.ip);
    }

    let addedBots = 0;
    for (const [pattern, count] of uaCount) {
      if (count < 5 || addedBots >= 10) continue;
      const ips = uaIps.get(pattern);
      if (!ips || ips.size < 3) continue;
      const exists = await db.get('SELECT 1 FROM learned_bot_patterns WHERE pattern = ?', [pattern]);
      if (exists) continue;
      if (autoApplyBots) {
        try {
          if (db.usePg) await db.run('INSERT INTO learned_bot_patterns (pattern, hit_count) VALUES (?, ?) ON CONFLICT (pattern) DO NOTHING', [pattern, count]);
          else await db.run('INSERT OR IGNORE INTO learned_bot_patterns (pattern, hit_count) VALUES (?, ?)', [pattern, count]);
          await loadLearnedBotPatterns();
          addedBots++;
        } catch (e) {}
      } else {
        const dataObj = { pattern, count, uniqueIps: ips.size };
        const dataStr = JSON.stringify(dataObj);
        await db.run("INSERT INTO suggested_improvements (type, data, status) VALUES ('new_bot', ?, 'pending')", [dataStr]);
        addedBots++;
      }
    }

    const fbReferrer = (await db.all(`SELECT DISTINCT ip FROM visitors WHERE was_blocked = 1 AND created_at >= ? AND (referrer LIKE '%facebook.com%' OR referrer LIKE '%fb.com%' OR referrer LIKE '%fb.me%') AND ip IS NOT NULL AND ip != 'unknown' LIMIT 20`, [start])) || [];
    const metaList = await db.all('SELECT ip_or_cidr FROM meta_reviewer_ips');
    const metaSet = new Set((metaList || []).map(r => r.ip_or_cidr));
    for (const row of fbReferrer) {
      const ip = row.ip;
      if (!ip || metaSet.has(ip)) continue;
      const dataStr = JSON.stringify({ ip, reason: 'Bloqueado com referrer Facebook' });
      await db.run("INSERT INTO suggested_improvements (type, data, status) VALUES ('new_reviewer_ip', ?, 'pending')", [dataStr]);
    }

    const countryBlocks = await db.all(`SELECT country, COUNT(*) as c FROM visitors WHERE was_blocked = 1 AND created_at >= ? AND country IS NOT NULL GROUP BY country ORDER BY c DESC LIMIT 5`, [start]);
    for (const row of countryBlocks || []) {
      if (!row.country || row.c < 10) continue;
      const dataStr = JSON.stringify({ country: row.country, blockCount: row.c, suggestion: 'País com muitos bloqueios – considere adicionar à whitelist se for tráfego desejado' });
      await db.run("INSERT INTO suggested_improvements (type, data, status) VALUES ('country_suggest', ?, 'pending')", [dataStr]);
    }
  } catch (e) {
    console.error('[AutoImprovement] Erro:', e.message);
  }
}

// API: Listar sugestões (admin)
app.get('/api/suggestions', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const list = await db.all("SELECT * FROM suggested_improvements WHERE status = 'pending' ORDER BY created_at DESC LIMIT 50");
  res.json(list || []);
});

app.post('/api/suggestions/:id/apply', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const row = await db.get('SELECT * FROM suggested_improvements WHERE id = ? AND status = ?', [req.params.id, 'pending']);
  if (!row) return res.status(404).json({ error: 'Sugestão não encontrada' });
  const data = typeof row.data === 'string' ? JSON.parse(row.data || '{}') : (row.data || {});
  if (row.type === 'new_bot' && data.pattern) {
    try {
      if (db.usePg) await db.run('INSERT INTO learned_bot_patterns (pattern, hit_count) VALUES (?, ?) ON CONFLICT (pattern) DO NOTHING', [data.pattern, data.count || 0]);
      else await db.run('INSERT OR IGNORE INTO learned_bot_patterns (pattern, hit_count) VALUES (?, ?)', [data.pattern, data.count || 0]);
      await loadLearnedBotPatterns();
    } catch (e) {}
  }
  if (row.type === 'new_reviewer_ip' && data.ip) {
    try {
      if (db.usePg) await db.run('INSERT INTO meta_reviewer_ips (ip_or_cidr, description) VALUES (?, ?) ON CONFLICT (ip_or_cidr) DO NOTHING', [data.ip, 'Sugerido automaticamente']);
      else await db.run('INSERT OR IGNORE INTO meta_reviewer_ips (ip_or_cidr, description) VALUES (?, ?)', [data.ip, 'Sugerido automaticamente']);
      await loadMetaReviewerIPs();
    } catch (e) {}
  }
  await db.run('UPDATE suggested_improvements SET status = ? WHERE id = ?', ['applied', req.params.id]);
  res.json({ success: true });
});

app.post('/api/suggestions/:id/reject', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  await db.run('UPDATE suggested_improvements SET status = ? WHERE id = ?', ['rejected', req.params.id]);
  res.json({ success: true });
});

// API: Padrões aprendidos (admin)
app.get('/api/learned-bots', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const list = await db.all('SELECT * FROM learned_bot_patterns ORDER BY hit_count DESC');
  res.json(list || []);
});

app.delete('/api/learned-bots/:id', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  await db.run('DELETE FROM learned_bot_patterns WHERE id = ?', [req.params.id]);
  await loadLearnedBotPatterns();
  res.json({ success: true });
});

app.post('/api/learned-bots', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { pattern } = req.body || {};
  const p = (pattern || '').trim();
  if (!p || p.length < 2) return res.status(400).json({ error: 'Padrão obrigatório (mín. 2 caracteres)' });
  try {
    await db.run('INSERT INTO learned_bot_patterns (pattern, hit_count) VALUES (?, ?)', [p, 0]);
    await loadLearnedBotPatterns();
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Padrão já existe' });
  }
});

// API: Configurações de auto-melhorias (admin)
app.get('/api/auto-improvements/settings', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const autoBots = (await db.get("SELECT value FROM settings WHERE key = 'auto_apply_learned_bots'"))?.value === '1';
  res.json({ auto_apply_learned_bots: autoBots, rate_limit_enabled: process.env.RATE_LIMIT_ENABLED !== '0' });
});

app.put('/api/auto-improvements/settings', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const val = req.body?.auto_apply_learned_bots ? '1' : '0';
  if (db.usePg) await db.run("INSERT INTO settings (key, value) VALUES ('auto_apply_learned_bots', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [val]);
  else await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_apply_learned_bots', ?)", [val]);
  res.json({ success: true });
});

app.post('/api/auto-improvements/run-now', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  await runAutoImprovementJob();
  res.json({ success: true, message: 'Análise executada' });
});

// API: allow_meta_reviewers (admin)
app.get('/api/settings/allow-meta-reviewers', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const row = await db.get("SELECT value FROM settings WHERE key = 'allow_meta_reviewers'");
  res.json({ allow_meta_reviewers: row?.value === '1' });
});

app.put('/api/settings/allow-meta-reviewers', async (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
  const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const val = req.body?.allow_meta_reviewers ? '1' : '0';
  if (db.usePg) {
    await db.run("INSERT INTO settings (key, value) VALUES ('allow_meta_reviewers', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [val]);
  } else {
    await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('allow_meta_reviewers', ?)", [val]);
  }
  res.json({ success: true });
});

// Helper: verifica se IP está em CIDR (ex: 31.13.24.0/21)
function ipInCidr(ip, cidr) {
  if (!ip || !cidr) return false;
  const parts = cidr.split('/');
  const cidrIp = parts[0];
  const bits = parseInt(parts[1], 10) || 32;
  if (ip === cidrIp) return true;
  const ipToNum = (a) => {
    const n = a.split('.').map(Number);
    return (n[0] << 24) | (n[1] << 16) | (n[2] << 8) | n[3];
  };
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToNum(ip) & mask) === (ipToNum(cidrIp) & mask);
}

// Cache de IPs de revisão (Meta/AWS/GCP) – admin pode adicionar
let metaReviewerIPsCache = [];
async function loadMetaReviewerIPs() {
  try {
    const rows = await db.all('SELECT ip_or_cidr FROM meta_reviewer_ips');
    metaReviewerIPsCache = (rows || []).map(r => r.ip_or_cidr).filter(Boolean);
  } catch (e) {
    metaReviewerIPsCache = [];
  }
}

// Padrões de bot aprendidos automaticamente
let learnedBotPatternsCache = [];
async function loadLearnedBotPatterns() {
  try {
    const rows = await db.all('SELECT pattern FROM learned_bot_patterns');
    learnedBotPatternsCache = (rows || []).map(r => r.pattern).filter(Boolean);
  } catch (e) {
    learnedBotPatternsCache = [];
  }
}
function isLearnedBot(ua) {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return learnedBotPatternsCache.some(p => u.includes((p || '').toLowerCase()));
}

// Rate limit por IP – bloqueio temporário (excesso de requisições)
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;   // 5 min
const RATE_LIMIT_MAX_REQUESTS = 25;            // máx requisições por janela
const RATE_LIMIT_BLOCK_MS = 5 * 60 * 1000;    // bloqueia por 5 min
const ipRequestCount = new Map();              // ip -> { count, firstAt }
const ipBlockedUntil = new Map();              // ip -> timestamp até desbloquear

function checkRateLimit(ip) {
  const enabled = (process.env.RATE_LIMIT_ENABLED !== '0');
  if (!enabled || !ip || ip === 'unknown') return { blocked: false };
  const now = Date.now();
  if (ipBlockedUntil.has(ip) && ipBlockedUntil.get(ip) > now) {
    return { blocked: true, reason: 'Muitas requisições (IP bloqueado temporariamente)' };
  }
  if (ipBlockedUntil.get(ip) <= now) ipBlockedUntil.delete(ip);
  let entry = ipRequestCount.get(ip);
  if (!entry) { entry = { count: 0, firstAt: now }; ipRequestCount.set(ip, entry); }
  if (now - entry.firstAt > RATE_LIMIT_WINDOW_MS) { entry.count = 0; entry.firstAt = now; }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    ipBlockedUntil.set(ip, now + RATE_LIMIT_BLOCK_MS);
    return { blocked: true, reason: 'Excesso de requisições – tente novamente em alguns minutos' };
  }
  return { blocked: false };
}
function isSuspectedReviewerIP(ip) {
  if (!ip || ip === 'unknown' || ip.startsWith('::')) return false;
  const norm = ip.replace(/^::ffff:/, '');
  return metaReviewerIPsCache.some(entry => {
    if (entry.includes('/')) return ipInCidr(norm, entry);
    return norm === entry;
  });
}

// Helper: IP público (não localhost/VPN interna)
function isPrivateIP(ip) {
  if (!ip || ip === 'unknown') return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')) return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.2') || ip.startsWith('172.30.') || ip.startsWith('172.31.')) return true;
  return false;
}

// Helper: geolocalização por IP – retorna { country, city, region, isp } (ipapi.co + fallback ip-api.com)
async function getGeoByIP(ip) {
  const out = { country: null, city: null, region: null, isp: null };
  if (!ip || isPrivateIP(ip)) return out;
  const normalized = ip.replace(/^::ffff:/, '');
  const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' };

  try {
    const res = await fetch(`https://ipapi.co/${normalized}/json/`, { signal: AbortSignal.timeout(5000), headers });
    if (res.ok) {
      const geo = await res.json();
      if (geo.country_code) {
        out.country = geo.country_code;
        out.city = geo.city || null;
        out.region = geo.region || null;
        out.isp = geo.org || geo.organisation || null;
        return out;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`http://ip-api.com/json/${normalized}?fields=countryCode,city,regionName,isp`, { signal: AbortSignal.timeout(5000), headers });
    if (res.ok) {
      const geo = await res.json();
      if (geo.countryCode) {
        out.country = geo.countryCode;
        out.city = geo.city || null;
        out.region = geo.regionName || null;
        out.isp = geo.isp || null;
        return out;
      }
    }
  } catch (e) {}

  try {
    const res = await fetch(`https://ipwho.is/${normalized}`, { signal: AbortSignal.timeout(5000), headers });
    if (res.ok) {
      const geo = await res.json();
      if (geo.success && geo.country_code) {
        out.country = geo.country_code;
        out.city = geo.city || null;
        out.region = geo.region || null;
        out.isp = (geo.connection && (geo.connection.isp || geo.connection.org)) || null;
        return out;
      }
    }
  } catch (e) {}

  return out;
}

// Helper: ao bloquear com opção "mostrar no mesmo link", busca a URL e devolve o HTML com <base> para links relativos
async function sendEmbeddedPage(res, targetUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      res.redirect(302, targetUrl);
      return;
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html')) {
      res.redirect(302, targetUrl);
      return;
    }
    let html = await response.text();
    const baseOrigin = (() => { try { return new URL(targetUrl).origin + '/'; } catch (e) { return targetUrl; } })();
    const baseTag = `<base href="${baseOrigin.replace(/"/g, '&quot;')}">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    } else {
      html = baseTag + html;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.redirect(302, targetUrl);
  }
}

async function sendCustomPage(res, site) {
  const pageId = site.landing_page_id;
  if (!pageId || !site.user_id) return false;
  const page = await db.get('SELECT html_content FROM landing_pages WHERE id = ? AND user_id = ?', [pageId, site.user_id]);
  if (!page || page.html_content == null) return false;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(page.html_content);
  return true;
}

// Delay anti-detecção (50–150ms) antes de redirect – evita padrão de resposta instantânea
function redirectWithDelay(res, url, status = 302) {
  const delay = 50 + Math.floor(Math.random() * 100);
  setTimeout(() => res.redirect(status, url), delay);
}

// Handler compartilhado para /go/ e /r/ (rota alternativa para diversificar URLs)
async function handleLinkRedirect(req, res) {
  const code = (req.params.code || '').toLowerCase();
  const site = await db.get('SELECT * FROM sites WHERE link_code = ? AND is_active = 1', [code]);
  if (!site || !site.target_url) {
    return redirectWithDelay(res, 'https://www.google.com/');
  }

  // Parâmetro de rastreamento (Meta Ads): se o site exige ref, só permite quem vier com ref=TOKEN
  const refParam = (req.query.ref || '').trim();
  if (site.required_ref_token) {
    if (refParam !== site.required_ref_token) {
      const blockReasonRef = 'Acesso sem parâmetro de rastreamento (não veio do Ads)';
      const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
      await db.run(`INSERT INTO visitors (site_id, ip, user_agent, referrer, page_url, country, was_blocked, block_reason, is_bot, request_path, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, ?, datetime('now'))`,
        [site.site_id, (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString().split(',')[0].trim() || 'unknown', req.headers['user-agent'] || '', (req.headers['referer'] || req.headers['referrer'] || ''), fullUrl, null, blockReasonRef, req.path]);
      const blockUrl = site.redirect_url || 'https://www.google.com/';
      if ((site.block_behavior || 'redirect') === 'page') { if (await sendCustomPage(res, site)) return; }
      if ((site.block_behavior || 'redirect') === 'embed') return sendEmbeddedPage(res, blockUrl);
      return redirectWithDelay(res, blockUrl);
    }
  }

  // IP: prioridade cf-connecting-ip (Cloudflare), true-client-ip, x-forwarded-for (1º = cliente), x-real-ip, socket
  let ip = (req.headers['cf-connecting-ip'] || req.headers['true-client-ip'] || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket.remoteAddress || '').toString();
  ip = ip.split(',')[0].trim();
  if (ip === '::1') ip = '127.0.0.1';
  if (!ip) ip = 'unknown';

  // Rate limit: bloqueio temporário por excesso de requisições
  const rateCheck = checkRateLimit(ip);
  if (rateCheck.blocked) {
    const pageUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    await db.run(`INSERT INTO visitors (site_id, ip, user_agent, referrer, page_url, was_blocked, block_reason, request_path, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'))`,
      [site.site_id, ip, req.headers['user-agent'] || '', (req.headers['referer'] || req.headers['referrer'] || ''), pageUrl, rateCheck.reason, req.path]);
    const blockUrl = site.redirect_url || 'https://www.google.com/';
    return redirectWithDelay(res, blockUrl);
  }

  const userAgent = req.headers['user-agent'] || '';
  const referer = (req.headers['referer'] || req.headers['referrer'] || '').toLowerCase();
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const parser = new UAParser(userAgent);
  const ua = parser.getResult();
  const deviceType = (ua.device && ua.device.type) ? ua.device.type : (userAgent.toLowerCase().match(/mobile|android|iphone|ipad/) ? 'mobile' : 'desktop');

  const geo = await getGeoByIP(ip);
  const country = geo.country;
  const suspectedReviewer = isSuspectedReviewerIP(ip);

  // Se IP é de revisão do Meta e allow_meta_reviewers=1: mostrar landing para passar na análise
  const allowMetaReviewers = (await db.get("SELECT value FROM settings WHERE key = 'allow_meta_reviewers'"))?.value === '1';
  if (suspectedReviewer && allowMetaReviewers && site.target_url) {
    let dest = site.target_url;
    const qs = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
    if (qs) dest += (dest.includes('?') ? '&' : '?') + qs;
    await db.run(`INSERT INTO visitors (site_id, ip, user_agent, referrer, page_url, country, request_path, is_suspected_reviewer, was_blocked, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'))`,
      [site.site_id, ip, userAgent, referer, fullUrl, country || null, req.path]);
    return redirectWithDelay(res, dest);
  }

  const allowedList = (site.allowed_countries || 'BR').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
  const blockedList = (site.blocked_countries || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);

  function isDesktop() {
    const u = userAgent.toLowerCase();
    return !/mobile|android|iphone|ipad|webos|blackberry|iemobile|opera mini/i.test(u);
  }
  function isFromFacebook() {
    return referer.includes('facebook.com') || referer.includes('fb.com') || fullUrl.toLowerCase().includes('fbclid=');
  }
  function isBot() {
    const u = userAgent.toLowerCase();
    if (isLearnedBot(userAgent)) return true;
    const bots = [
      'bot', 'crawler', 'spider', 'googlebot', 'facebookexternalhit', 'facebookcatalog', 'facebot', 'facebooksdk',
      'whatsapp', 'instagram', 'slurp', 'duckduckbot', 'bingbot', 'yandex', 'baiduspider', 'sogou',
      'curl', 'wget', 'python-requests', 'python/', 'java/', 'go-http-client', 'php/',
      'headless', 'headlesschrome', 'puppeteer', 'phantom', 'selenium', 'playwright', 'chromedriver', 'geckodriver', 'phantomjs',
      'lighthouse', 'gtmetrix', 'screaming frog', 'semrush', 'ahrefsbot', 'dotbot', 'rogerbot', 'proximic',
      'mediapartners', 'adsbot', 'ia_archiver', 'archive.org', 'x-purpose'
    ];
    return bots.some(b => u.includes(b)) || !!req.headers['x-purpose'];
  }
  function isEmulator() {
    const u = userAgent.toLowerCase();
    return /android sdk|sdk_gphone|emulator|generic.*android|build\/generic|model.*unknown|vbox|genymotion|bluestacks|nox|andy|droid4x|memu|koplayer|mumu/i.test(u) ||
      (ua.device && (ua.device.model === 'unknown' || ua.device.model === 'Emulator'));
  }

  let blockReason = null;
  if (site.block_bots && isBot()) blockReason = 'Bot detectado';
  else if (isEmulator()) blockReason = 'Emulador detectado (apenas celular real permitido)';
  else if (site.block_desktop && isDesktop()) blockReason = 'Desktop detectado';
  else if (site.block_facebook_library && isFromFacebook() && isDesktop()) blockReason = 'Biblioteca Facebook';
  else if (allowedList.length > 0) {
    const countryUpper = country ? country.toUpperCase() : null;
    if (!countryUpper) blockReason = 'País não identificado pelo IP (bloqueado por segurança)';
    else if (!allowedList.includes(countryUpper)) blockReason = `País não permitido: ${countryUpper}`;
    else if (blockedList.length > 0 && blockedList.includes(countryUpper)) blockReason = `País bloqueado: ${countryUpper}`;
  } else if (country && blockedList.includes(country.toUpperCase())) blockReason = `País bloqueado: ${country}`;

  const wasBlocked = !!blockReason;

  // UTMs e parâmetros dos Ads (vêm na URL do clique) – repassados para o link de oferta no redirect
  const utm_source = (req.query.utm_source || '').trim() || null;
  const utm_medium = (req.query.utm_medium || '').trim() || null;
  const utm_campaign = (req.query.utm_campaign || '').trim() || null;
  const utm_term = (req.query.utm_term || '').trim() || null;
  const utm_content = (req.query.utm_content || '').trim() || null;
  const fbclid = (req.query.fbclid || '').trim() || null;
  const facebookParams = fbclid ? JSON.stringify({ fbclid }) : null;

  const suspectedRev = suspectedReviewer ? 1 : 0;
  await db.run(`INSERT INTO visitors (site_id, ip, user_agent, referrer, page_url, country, city, region, isp, device_type, browser, os, was_blocked, block_reason, is_bot, utm_source, utm_medium, utm_campaign, utm_term, utm_content, facebook_params, request_path, is_suspected_reviewer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [site.site_id, ip, userAgent, referer, fullUrl, country || null, geo.city || null, geo.region || null, geo.isp || null, deviceType, ua.browser?.name || null, ua.os?.name || null, wasBlocked ? 1 : 0, blockReason, isBot() ? 1 : 0, utm_source, utm_medium, utm_campaign, utm_term, utm_content, facebookParams, req.path, suspectedRev]);

  if (wasBlocked) {
    const blockUrl = site.redirect_url || 'https://www.google.com/';
    if ((site.block_behavior || 'redirect') === 'page') { if (await sendCustomPage(res, site)) return; }
    if ((site.block_behavior || 'redirect') === 'embed') return sendEmbeddedPage(res, blockUrl);
    return redirectWithDelay(res, blockUrl);
  }

  // Redireciona para a oferta com a mesma query string (UTMs, fbclid, etc.) para a landing receber
  let dest = site.target_url;
  const qs = req.originalUrl.includes('?') ? req.originalUrl.split('?')[1] : '';
  if (qs) dest += (dest.includes('?') ? '&' : '?') + qs;
  return redirectWithDelay(res, dest);
}

app.get(['/go/:code', '/r/:code', '/l/:code', '/v/:code'], handleLinkRedirect);

// Servir script dinâmico por site (opcional – modo antigo)
app.get('/t/:siteId.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'tracker.js'));
});

// Servir painel
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
db.initDb().then(async () => {
  await loadMetaReviewerIPs();
  await loadLearnedBotPatterns();
  setInterval(loadMetaReviewerIPs, 5 * 60 * 1000);
  setInterval(loadLearnedBotPatterns, 10 * 60 * 1000);
  runAutoImprovementJob();
  setInterval(runAutoImprovementJob, 6 * 60 * 60 * 1000); // a cada 6h
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🔒 CLOAKER PRO - Painel de Controle             ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  🚀 Servidor rodando em: http://localhost:${PORT}            ║
║  📊 Painel de controle: http://localhost:${PORT}             ║
║                                                           ║
║  📝 Como usar:                                            ║
║     1. Acesse o painel → Link para Ads                    ║
║     2. Cole a URL da sua landing page → Gerar link        ║
║     3. Use o link gerado como URL de destino nos Ads      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error('Erro ao iniciar:', err);
});
