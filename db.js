/**
 * Camada de banco: SQLite (padrão) ou PostgreSQL quando DATABASE_URL está definido.
 * Permite múltiplas réplicas do app no Railway usando o mesmo banco externo.
 * API async: initDb(), run(sql, params), get(sql, params), all(sql, params).
 */

const path = require('path');
const fs = require('fs');

const usePg = !!process.env.DATABASE_URL;
let db; // SQLite
let pool; // PostgreSQL

function convertPlaceholders(sql) {
  let i = 0;
  let text = sql.replace(/\?/g, () => `$${++i}`);
  if (usePg) text = text.replace(/datetime\s*\(\s*['"]now['"]\s*\)/gi, 'NOW()');
  return text;
}

// ---------- PostgreSQL ----------
async function initPg() {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id SERIAL PRIMARY KEY,
        site_id TEXT UNIQUE NOT NULL,
        link_code TEXT UNIQUE,
        user_id INTEGER,
        name TEXT,
        domain TEXT,
        target_url TEXT,
        redirect_url TEXT DEFAULT 'https://www.google.com/',
        block_desktop SMALLINT DEFAULT 1,
        block_facebook_library SMALLINT DEFAULT 1,
        block_bots SMALLINT DEFAULT 1,
        block_vpn SMALLINT DEFAULT 0,
        block_devtools SMALLINT DEFAULT 1,
        allowed_countries TEXT DEFAULT 'BR',
        blocked_countries TEXT DEFAULT '',
        is_active SMALLINT DEFAULT 1,
        required_ref_token TEXT,
        block_behavior TEXT DEFAULT 'redirect',
        default_link_params TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        site_id TEXT,
        visitor_id TEXT,
        ip TEXT,
        country TEXT,
        city TEXT,
        region TEXT,
        isp TEXT,
        timezone TEXT,
        user_agent TEXT,
        browser TEXT,
        browser_version TEXT,
        os TEXT,
        os_version TEXT,
        device_type TEXT,
        device_vendor TEXT,
        device_model TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        color_depth INTEGER,
        pixel_ratio REAL,
        language TEXT,
        languages TEXT,
        platform TEXT,
        cookies_enabled SMALLINT,
        do_not_track SMALLINT,
        online SMALLINT,
        touch_support SMALLINT,
        max_touch_points INTEGER,
        hardware_concurrency INTEGER,
        device_memory REAL,
        connection_type TEXT,
        connection_speed TEXT,
        referrer TEXT,
        page_url TEXT,
        page_title TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        facebook_params TEXT,
        is_bot SMALLINT,
        bot_reason TEXT,
        was_blocked SMALLINT,
        block_reason TEXT,
        webgl_vendor TEXT,
        webgl_renderer TEXT,
        canvas_fingerprint TEXT,
        audio_fingerprint TEXT,
        fonts_detected TEXT,
        plugins TEXT,
        battery_level REAL,
        battery_charging SMALLINT,
        local_storage SMALLINT,
        session_storage SMALLINT,
        indexed_db SMALLINT,
        ad_blocker SMALLINT,
        webrtc_leak TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        cloaker_base_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS allowed_domains (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        domain TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_domains_user_domain ON allowed_domains(user_id, domain)
    `).catch(() => {});
    try { await client.query('ALTER TABLE allowed_domains ADD COLUMN railway_cname_target TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE allowed_domains ADD COLUMN railway_txt_verify TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE sites ADD COLUMN selected_domain TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE sites ADD COLUMN landing_page_id INTEGER'); } catch (e) {}
    try { await client.query('ALTER TABLE sites ADD COLUMN fallback_override_url TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE sites ADD COLUMN use_fallback SMALLINT DEFAULT 1'); } catch (e) {}
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_fallbacks (
        id SERIAL PRIMARY KEY,
        site_id TEXT NOT NULL,
        fallback_url TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await client.query(`
      CREATE TABLE IF NOT EXISTS landing_pages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        html_content TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_site_created ON visitors(site_id, created_at)
    `).catch(() => {});
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors(created_at)
    `).catch(() => {});

    const r = await client.query("SELECT 1 FROM settings WHERE key = 'cloaker_base_url' LIMIT 1");
    if (r.rows.length === 0) {
      await client.query("INSERT INTO settings (key, value) VALUES ('cloaker_base_url', '') ON CONFLICT (key) DO NOTHING");
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_reviewer_ips (
        id SERIAL PRIMARY KEY,
        ip_or_cidr TEXT NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    try { await client.query('ALTER TABLE visitors ADD COLUMN request_path TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE users ADD COLUMN cloaker_path TEXT'); } catch (e) {}
    try { await client.query('ALTER TABLE visitors ADD COLUMN is_suspected_reviewer SMALLINT DEFAULT 0'); } catch (e) {}
    const metaCount = await client.query('SELECT COUNT(*) as c FROM meta_reviewer_ips');
    if (metaCount.rows[0] && metaCount.rows[0].c === 0) {
      const defaults = ['31.13.24.0/21', '31.13.64.0/18', '66.220.144.0/20', '69.171.224.0/19', '157.240.0.0/17', '173.252.64.0/18'];
      for (const cidr of defaults) {
        try { await client.query("INSERT INTO meta_reviewer_ips (ip_or_cidr, description) VALUES ($1, 'Meta/Facebook')", [cidr]); } catch (e) {}
      }
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS learned_bot_patterns (
        id SERIAL PRIMARY KEY,
        pattern TEXT NOT NULL UNIQUE,
        hit_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
    await client.query(`
      CREATE TABLE IF NOT EXISTS suggested_improvements (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        data TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `).catch(() => {});
  } finally {
    client.release();
  }
  console.log('✅ Banco PostgreSQL inicializado');
}

async function pgRun(sql, params) {
  const text = convertPlaceholders(sql);
  await pool.query(text, params);
  return true;
}

async function pgGet(sql, params) {
  const text = convertPlaceholders(sql);
  const r = await pool.query(text, params);
  return r.rows[0] || null;
}

async function pgAll(sql, params) {
  const text = convertPlaceholders(sql);
  const r = await pool.query(text, params);
  return r.rows;
}

// ---------- SQLite ----------
async function initSqlite() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const DB_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'cloaker.db')
    : path.join(__dirname, 'cloaker.db');

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS sites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT UNIQUE,
      link_code TEXT UNIQUE,
      user_id INTEGER,
      name TEXT,
      domain TEXT,
      target_url TEXT,
      redirect_url TEXT DEFAULT 'https://www.google.com/',
      block_desktop INTEGER DEFAULT 1,
      block_facebook_library INTEGER DEFAULT 1,
      block_bots INTEGER DEFAULT 1,
      block_vpn INTEGER DEFAULT 0,
      block_devtools INTEGER DEFAULT 1,
      allowed_countries TEXT DEFAULT 'BR',
      blocked_countries TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  try { db.run('ALTER TABLE sites ADD COLUMN link_code TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN target_url TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN user_id INTEGER'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN required_ref_token TEXT'); } catch (e) {}
  try { db.run("ALTER TABLE sites ADD COLUMN block_behavior TEXT DEFAULT 'redirect'"); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN default_link_params TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN selected_domain TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN landing_page_id INTEGER'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN fallback_override_url TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE sites ADD COLUMN use_fallback INTEGER DEFAULT 1'); } catch (e) {}
  try { db.run('CREATE TABLE IF NOT EXISTS site_fallbacks (id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, fallback_url TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)'); } catch (e) {}
  db.run(`
    CREATE TABLE IF NOT EXISTS landing_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      html_content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT,
      visitor_id TEXT,
      ip TEXT,
      country TEXT,
      city TEXT,
      region TEXT,
      isp TEXT,
      timezone TEXT,
      user_agent TEXT,
      browser TEXT,
      browser_version TEXT,
      os TEXT,
      os_version TEXT,
      device_type TEXT,
      device_vendor TEXT,
      device_model TEXT,
      screen_width INTEGER,
      screen_height INTEGER,
      viewport_width INTEGER,
      viewport_height INTEGER,
      color_depth INTEGER,
      pixel_ratio REAL,
      language TEXT,
      languages TEXT,
      platform TEXT,
      cookies_enabled INTEGER,
      do_not_track INTEGER,
      online INTEGER,
      touch_support INTEGER,
      max_touch_points INTEGER,
      hardware_concurrency INTEGER,
      device_memory REAL,
      connection_type TEXT,
      connection_speed TEXT,
      referrer TEXT,
      page_url TEXT,
      page_title TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_term TEXT,
      utm_content TEXT,
      facebook_params TEXT,
      is_bot INTEGER,
      bot_reason TEXT,
      was_blocked INTEGER,
      block_reason TEXT,
      webgl_vendor TEXT,
      webgl_renderer TEXT,
      canvas_fingerprint TEXT,
      audio_fingerprint TEXT,
      fonts_detected TEXT,
      plugins TEXT,
      battery_level REAL,
      battery_charging INTEGER,
      local_storage INTEGER,
      session_storage INTEGER,
      indexed_db INTEGER,
      ad_blocker INTEGER,
      webrtc_leak TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'user', status TEXT DEFAULT 'active', cloaker_base_url TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  try { db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch (e) {}
  try { db.run('ALTER TABLE users ADD COLUMN cloaker_base_url TEXT'); } catch (e) {}
  try { db.run("ALTER TABLE users ADD COLUMN cloaker_path TEXT DEFAULT 'go'"); } catch (e) {}
  db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
  try { db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('cloaker_base_url', '')"); } catch (e) {}
  db.run(`CREATE TABLE IF NOT EXISTS allowed_domains (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, domain TEXT NOT NULL, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
  try { db.run('ALTER TABLE allowed_domains ADD COLUMN user_id INTEGER'); } catch (e) {}
  try { db.run('ALTER TABLE allowed_domains ADD COLUMN railway_cname_target TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE allowed_domains ADD COLUMN railway_txt_verify TEXT'); } catch (e) {}
  try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_allowed_domains_user_domain ON allowed_domains(user_id, domain)'); } catch (e) {}

  const firstAdmin = db.prepare("SELECT id FROM users WHERE role = ? ORDER BY id ASC LIMIT 1");
  firstAdmin.bind(['admin']);
  if (firstAdmin.step()) {
    const id = firstAdmin.getAsObject().id;
    firstAdmin.free();
    db.run('UPDATE allowed_domains SET user_id = ? WHERE user_id IS NULL', [id]);
  } else {
    try { firstAdmin.free(); } catch (e) {}
  }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_visitors_site_created ON visitors(site_id, created_at)'); } catch (e) {}
  try { db.run('CREATE INDEX IF NOT EXISTS idx_visitors_created ON visitors(created_at)'); } catch (e) {}
  try { db.run('CREATE TABLE IF NOT EXISTS meta_reviewer_ips (id INTEGER PRIMARY KEY AUTOINCREMENT, ip_or_cidr TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)'); } catch (e) {}
  try { db.run('ALTER TABLE visitors ADD COLUMN request_path TEXT'); } catch (e) {}
  try { db.run('ALTER TABLE visitors ADD COLUMN is_suspected_reviewer INTEGER DEFAULT 0'); } catch (e) {}
  try {
    const st = db.prepare('SELECT COUNT(*) as c FROM meta_reviewer_ips');
    const cnt = st.step() ? st.getAsObject() : { c: 0 };
    st.free();
    if (cnt && cnt.c === 0) {
      const defaults = ['31.13.24.0/21', '31.13.64.0/18', '66.220.144.0/20', '69.171.224.0/19', '157.240.0.0/17', '173.252.64.0/18'];
      const ins = db.prepare('INSERT OR IGNORE INTO meta_reviewer_ips (ip_or_cidr, description) VALUES (?, ?)');
      defaults.forEach(cidr => { ins.run([cidr, 'Meta/Facebook']); });
      ins.free();
    }
  } catch (e) {}
  try { db.run('CREATE TABLE IF NOT EXISTS learned_bot_patterns (id INTEGER PRIMARY KEY AUTOINCREMENT, pattern TEXT UNIQUE NOT NULL, hit_count INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)'); } catch (e) {}
  try { db.run('CREATE TABLE IF NOT EXISTS suggested_improvements (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, data TEXT, status TEXT DEFAULT \'pending\', created_at TEXT DEFAULT CURRENT_TIMESTAMP)'); } catch (e) {}

  const DB_PATH_FOR_SAVE = DB_PATH;
  const saveDb = () => {
    try {
      const data = db.export();
      fs.writeFileSync(DB_PATH_FOR_SAVE, Buffer.from(data));
    } catch (e) {
      console.error('Save DB Error:', e.message);
    }
  };
  saveDb();
  db.saveDb = saveDb;
  console.log('✅ Banco SQLite inicializado');
}

function sqliteRun(sql, params) {
  try {
    db.run(sql, params);
    if (db.saveDb) db.saveDb();
    return true;
  } catch (e) {
    console.error('SQL Error:', e.message);
    return false;
  }
}

function sqliteGet(sql, params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (e) {
    console.error('SQL Error:', e.message);
    return null;
  }
}

function sqliteAll(sql, params) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) results.push(stmt.getAsObject());
    stmt.free();
    return results;
  } catch (e) {
    console.error('SQL Error:', e.message);
    return [];
  }
}

// ---------- API unificada (sempre async) ----------
async function initDb() {
  if (usePg) {
    await initPg();
    return;
  }
  await initSqlite();
}

function run(sql, params = []) {
  if (usePg) return pgRun(sql, params);
  return Promise.resolve(sqliteRun(sql, params));
}

function get(sql, params = []) {
  if (usePg) return pgGet(sql, params);
  return Promise.resolve(sqliteGet(sql, params));
}

function all(sql, params = []) {
  if (usePg) return pgAll(sql, params);
  return Promise.resolve(sqliteAll(sql, params));
}

function getLastId() {
  if (usePg) return null; // use RETURNING in INSERT
  try {
    const row = db.prepare('SELECT last_insert_rowid() as id').step() ? db.prepare('SELECT last_insert_rowid() as id').getAsObject() : null;
    return row ? row.id : null;
  } catch (e) {
    return null;
  }
}

module.exports = { initDb, run, get, all, getLastId, usePg };
