/**
 * Script de proteção – cole como primeira tag no <head> do seu site.
 * Uso: <script src="https://SERVIDOR_URL/t/SEU_SITE_ID.js"></script>
 */

(function() {
  'use strict';

  // 🚨 IMEDIATO: esconde a página ANTES de qualquer coisa (visitante não vê o site)
  (function hidePageNow() {
    var d = document.documentElement;
    if (d) {
      d.style.setProperty('visibility', 'hidden', 'important');
      d.style.setProperty('opacity', '0', 'important');
    }
  })();

  // ⚙️ CONFIGURAÇÃO - O script detecta automaticamente pelo URL ou use os valores abaixo
  const SCRIPT_SRC = document.currentScript?.src || '';
  const URL_MATCH = SCRIPT_SRC.match(/\/t\/([^.]+)\.js/);
  
  const CONFIG = {
    SERVER_URL: SCRIPT_SRC ? new URL(SCRIPT_SRC).origin : 'http://localhost:3000',
    SITE_ID: URL_MATCH ? URL_MATCH[1] : 'default',
    
    // Fallback - caso não carregue do servidor
    REDIRECT_URL: 'https://www.google.com/',
    BLOCK_DESKTOP: true,
    BLOCK_FACEBOOK_LIBRARY: true,
    BLOCK_BOTS: true,
    BLOCK_DEVTOOLS: true,
    BLOCK_RIGHT_CLICK: true,
    ALLOWED_COUNTRIES: ['BR'],
    BLOCKED_COUNTRIES: []
  };

  let serverConfig = null;

  // 👁️ Mostrar a página (só chamar quando visitante for permitido)
  function showPage() {
    var d = document.documentElement;
    if (d) {
      d.style.removeProperty('visibility');
      d.style.removeProperty('opacity');
    }
  }

  // 🔄 Carregar configurações do servidor
  async function loadConfig() {
    try {
      const res = await fetch(`${CONFIG.SERVER_URL}/api/config/${CONFIG.SITE_ID}`, { timeout: 3000 });
      if (res.ok) {
        serverConfig = await res.json();
        CONFIG.REDIRECT_URL = serverConfig.redirect_url || CONFIG.REDIRECT_URL;
        CONFIG.BLOCK_DESKTOP = serverConfig.block_desktop;
        CONFIG.BLOCK_FACEBOOK_LIBRARY = serverConfig.block_facebook_library;
        CONFIG.BLOCK_BOTS = serverConfig.block_bots;
        CONFIG.BLOCK_DEVTOOLS = serverConfig.block_devtools;
        CONFIG.ALLOWED_COUNTRIES = serverConfig.allowed_countries ? serverConfig.allowed_countries.split(',').filter(c => c) : [];
        CONFIG.BLOCKED_COUNTRIES = serverConfig.blocked_countries ? serverConfig.blocked_countries.split(',').filter(c => c) : [];
      }
    } catch (e) {
      console.debug('Config load error:', e);
    }
  }

  // 🆔 Gerar ID único do visitante
  function generateVisitorId() {
    try {
      const stored = localStorage.getItem('_vid');
      if (stored) return stored;
      const id = 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
      localStorage.setItem('_vid', id);
      return id;
    } catch (e) {
      return 'v_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
  }

  // 📱 Detectar tipo de dispositivo
  function getDeviceInfo() {
    const ua = navigator.userAgent.toLowerCase();
    
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
    const isTablet = /ipad|tablet|playbook|silk/i.test(ua) || (isMobile && window.innerWidth > 768);
    const isDesktop = !isMobile && !isTablet;
    
    let os = 'Unknown';
    if (ua.includes('windows nt 10')) os = 'Windows 10';
    else if (ua.includes('windows nt 11')) os = 'Windows 11';
    else if (ua.includes('windows nt')) os = 'Windows';
    else if (ua.includes('macintosh') || ua.includes('mac os x')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
    
    return { isMobile, isTablet, isDesktop, os, type: isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop') };
  }

  function detectBot() {
    const ua = navigator.userAgent.toLowerCase();
    const botPatterns = [
      'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'slurp', 'baiduspider', 'sogou',
      'facebookexternalhit', 'facebookcatalog', 'facebot', 'facebooksdk', 'whatsapp', 'instagram',
      'ia_archiver', 'linkedinbot', 'twitterbot', 'pinterest', 'semrushbot', 'ahrefsbot',
      'dotbot', 'rogerbot', 'screaming frog', 'proximic', 'adsbot', 'mediapartners',
      'chrome-lighthouse', 'headlesschrome', 'phantomjs', 'selenium', 'puppeteer', 'playwright',
      'webdriver', 'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests', 'java', 'perl', 'go-http-client', 'php/'
    ];

    for (const pattern of botPatterns) {
      if (ua.includes(pattern)) {
        return { isBot: true, reason: `User-Agent: ${pattern}` };
      }
    }

    if (navigator.webdriver) return { isBot: true, reason: 'WebDriver detectado' };
    if (!window.chrome && ua.includes('chrome')) return { isBot: true, reason: 'Chrome falso' };
    if (navigator.plugins && navigator.plugins.length === 0 && !getDeviceInfo().isMobile) {
      return { isBot: true, reason: 'Sem plugins' };
    }

    return { isBot: false, reason: null };
  }

  // 📍 Detectar Facebook
  function isFromFacebook() {
    const ref = (document.referrer || '').toLowerCase();
    const url = (window.location.href || '').toLowerCase();
    return ref.includes('facebook.com') || ref.includes('fb.com') || url.includes('fbclid=');
  }

  // 🔍 Extrair parâmetros UTM
  function getTrackingParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm: {
        source: params.get('utm_source'),
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
        term: params.get('utm_term'),
        content: params.get('utm_content')
      },
      facebook: {
        fbclid: params.get('fbclid'),
        fb_action_ids: params.get('fb_action_ids'),
        fb_source: params.get('fb_source')
      }
    };
  }

  // 🎨 WebGL fingerprint
  function getWebGLInfo() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { vendor: null, renderer: null };
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null
      };
    } catch (e) { return { vendor: null, renderer: null }; }
  }

  // Fingerprint canvas – usa texto neutro para evitar detecção
  function getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200; canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText(document.title || 'w', 2, 15);
      return canvas.toDataURL().slice(-50);
    } catch (e) { return null; }
  }

  // 🔋 Bateria
  async function getBatteryInfo() {
    try {
      if (!navigator.getBattery) return { level: null, charging: null };
      const battery = await navigator.getBattery();
      return { level: battery.level, charging: battery.charging };
    } catch (e) { return { level: null, charging: null }; }
  }

  // 📡 Conexão
  function getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { type: null, effectiveType: null };
    return { type: conn.type, effectiveType: conn.effectiveType };
  }

  // 🧩 Plugins
  function getPlugins() {
    const plugins = [];
    for (let i = 0; i < Math.min(navigator.plugins.length, 20); i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  // 🌐 Geolocalização por IP
  async function getGeoInfo() {
    try {
      const res = await fetch('https://ipapi.co/json/', { timeout: 3000 });
      const data = await res.json();
      return {
        ip: data.ip, country: data.country_code, countryName: data.country_name,
        city: data.city, region: data.region, isp: data.org, timezone: data.timezone
      };
    } catch (e) { return { ip: null, country: null, city: null, region: null, isp: null, timezone: null }; }
  }

  // 🛡️ Verificar se deve bloquear
  function shouldBlock(data) {
    const device = getDeviceInfo();
    
    if (CONFIG.BLOCK_DESKTOP && device.isDesktop) {
      return { block: true, reason: 'Desktop detectado' };
    }

    if (CONFIG.BLOCK_FACEBOOK_LIBRARY && isFromFacebook() && device.isDesktop) {
      return { block: true, reason: 'Biblioteca Facebook' };
    }

    const botCheck = detectBot();
    if (CONFIG.BLOCK_BOTS && botCheck.isBot) {
      return { block: true, reason: botCheck.reason };
    }

    if (data.geo?.country) {
      if (CONFIG.ALLOWED_COUNTRIES.length > 0 && !CONFIG.ALLOWED_COUNTRIES.includes(data.geo.country)) {
        return { block: true, reason: `País não permitido: ${data.geo.country}` };
      }
      if (CONFIG.BLOCKED_COUNTRIES.includes(data.geo.country)) {
        return { block: true, reason: `País bloqueado: ${data.geo.country}` };
      }
    }

    return { block: false, reason: null };
  }

  // 📤 Enviar dados
  async function sendTrackingData(data) {
    try {
      await fetch(`${CONFIG.SERVER_URL}/api/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      });
    } catch (e) { console.debug('Track error:', e); }
  }

  // 🚫 Bloquear DevTools
  function blockDevTools() {
    if (!CONFIG.BLOCK_DEVTOOLS) return;
    const device = getDeviceInfo();
    if (!device.isDesktop) return;

    document.addEventListener('keydown', function(e) {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i','c','j','k'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u') ||
        (e.metaKey && e.altKey && ['i','c','j'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        window.location.replace(CONFIG.REDIRECT_URL);
      }
    });

    if (CONFIG.BLOCK_RIGHT_CLICK) {
      document.addEventListener('contextmenu', e => e.preventDefault());
    }

    let devToolsOpen = false;
    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth > 160;
      const heightDiff = window.outerHeight - window.innerHeight > 160;
      if ((widthDiff || heightDiff) && !devToolsOpen) {
        devToolsOpen = true;
        window.location.replace(CONFIG.REDIRECT_URL);
      } else if (!widthDiff && !heightDiff) {
        devToolsOpen = false;
      }
    }, 1000);
  }

  // ⚡ BLOQUEIO IMEDIATO (sem rede, sem delay) – decide em milissegundos
  function shouldBlockSync() {
    const device = getDeviceInfo();
    if (CONFIG.BLOCK_DESKTOP && device.isDesktop) return { block: true, reason: 'Desktop detectado' };
    if (CONFIG.BLOCK_FACEBOOK_LIBRARY && isFromFacebook() && device.isDesktop) return { block: true, reason: 'Biblioteca Facebook' };
    const botCheck = detectBot();
    if (CONFIG.BLOCK_BOTS && botCheck.isBot) return { block: true, reason: botCheck.reason };
    return { block: false, reason: null };
  }

  // 📤 Enviar visita bloqueada (sync) para aparecer no painel – fire-and-forget
  function sendBlockedVisitSync(reason) {
    var device = getDeviceInfo();
    var trackingParams = getTrackingParams();
    var payload = {
      siteId: CONFIG.SITE_ID,
      visitorId: generateVisitorId(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      referrer: document.referrer || '',
      pageUrl: window.location.href,
      pageTitle: document.title,
      utm: trackingParams.utm,
      facebookParams: trackingParams.facebook,
      wasBlocked: true,
      blockReason: reason,
      isBot: detectBot().isBot,
      botReason: detectBot().reason,
      deviceType: device.type,
      geo: null
    };
    try {
      var url = CONFIG.SERVER_URL + '/api/track';
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      } else {
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
      }
    } catch (e) {}
  }

  // 🚀 INICIALIZAÇÃO
  async function init() {
    // 1) Decisão instantânea: se for bloquear, envia para o painel e redireciona
    var syncCheck = shouldBlockSync();
    if (syncCheck.block) {
      sendBlockedVisitSync(syncCheck.reason);
      window.location.replace(CONFIG.REDIRECT_URL);
      return;
    }

    // 2) Visitante passou no filtro rápido → mostra a página AGORA (sem esperar rede)
    showPage();

    // 3) Em background: carrega config, geo, envia tracking (não bloqueia a tela)
    await loadConfig();

    const device = getDeviceInfo();
    const botCheck = detectBot();
    const trackingParams = getTrackingParams();
    const webgl = getWebGLInfo();
    const geo = await getGeoInfo();
    const battery = await getBatteryInfo();

    const data = {
      siteId: CONFIG.SITE_ID,
      visitorId: generateVisitorId(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      languages: navigator.languages ? [...navigator.languages] : [],
      cookiesEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      online: navigator.onLine,
      screen: { width: screen.width, height: screen.height, colorDepth: screen.colorDepth, pixelRatio: window.devicePixelRatio },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: navigator.deviceMemory,
      connection: getConnectionInfo(),
      referrer: document.referrer,
      pageUrl: window.location.href,
      pageTitle: document.title,
      utm: trackingParams.utm,
      facebookParams: trackingParams.facebook,
      isBot: botCheck.isBot,
      botReason: botCheck.reason,
      geo: geo,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      webgl: webgl,
      fingerprints: { canvas: getCanvasFingerprint() },
      plugins: getPlugins(),
      battery: battery,
      storage: { localStorage: !!window.localStorage, sessionStorage: !!window.sessionStorage, indexedDB: !!window.indexedDB },
      deviceType: device.type
    };

    const blockCheck = shouldBlock(data);
    data.wasBlocked = blockCheck.block;
    data.blockReason = blockCheck.reason;

    await sendTrackingData(data);

    if (blockCheck.block) {
      window.location.replace(CONFIG.REDIRECT_URL);
      return;
    }

    blockDevTools();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
