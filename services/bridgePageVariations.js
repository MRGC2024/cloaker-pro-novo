/**
 * Variação leve por link (só ponte Carregando). Mesmo visual, HTML/CSS/JS únicos por seed.
 */

const LOADING_TEXTS = {
  pt: ['Carregando conteúdo…', 'Preparando a página…', 'Aguarde, carregando…', 'Sincronizando conteúdo…'],
  en: ['Loading content…', 'Preparing the page…', 'Please wait…', 'Syncing content…'],
  es: ['Cargando contenido…', 'Preparando la página…', 'Espera, cargando…', 'Sincronizando contenido…']
};
const OPENING_TEXT = { pt: 'Abrindo conteúdo…', en: 'Opening content…', es: 'Abriendo contenido…' };

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed) {
  let s = hashSeed(seed);
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function genToken(rng, min, max) {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const len = min + Math.floor(rng() * (max - min + 1));
  let o = chars[Math.floor(rng() * 26)];
  for (let i = 1; i < len; i++) o += chars[Math.floor(rng() * 26)];
  return o;
}

function generateBridgeFingerprint() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function resolveLoadingVariant(seed, lang) {
  const rng = rngFrom(seed);
  const texts = LOADING_TEXTS[lang] || LOADING_TEXTS.pt;
  const p = genToken(rng, 2, 4);
  const vars = [];
  for (let i = 0; i < 10; i++) vars.push(genToken(rng, 2, 5));
  const hue = 210 + Math.floor(rng() * 40);
  return {
    prefix: p,
    barId: p + 'b' + Math.floor(rng() * 90 + 10),
    statusId: p + 's' + Math.floor(rng() * 90 + 10),
    jsVars: vars,
    anim: p + 'a' + Math.floor(rng() * 900 + 100),
    bg: pick(rng, ['#f3f4f6', '#f4f6f8', '#eef1f5', '#f6f7f9']),
    accent: `hsl(${hue},${50 + Math.floor(rng() * 20)}%,${45 + Math.floor(rng() * 10)}%)`,
    accentLight: `hsl(${hue},${45 + Math.floor(rng() * 15)}%,${65 + Math.floor(rng() * 10)}%)`,
    maxW: 680 + Math.floor(rng() * 80),
    staticPct: 32 + Math.floor(rng() * 18),
    text: pick(rng, texts),
    opening: OPENING_TEXT[lang] || OPENING_TEXT.pt,
    font: pick(rng, ['system-ui,sans-serif', 'Segoe UI,system-ui,sans-serif', 'Roboto,Helvetica,sans-serif'])
  };
}

function buildLoadingTimerScript(navPath, timerSec, barId, statusId, jsVars, idleText, openText) {
  const [total, nav, t0, bar, lab, lock, n, applyFn, pullFn, tickFn] = jsVars;
  const idle = JSON.stringify(idleText || 'Carregando…');
  const opening = JSON.stringify(openText || 'Abrindo conteúdo…');
  return `<script>(function(){try{if(navigator.webdriver)return;var ${total}=${timerSec}*1000,${nav}=${JSON.stringify(navPath)},${t0}=Date.now(),${bar}=document.getElementById(${JSON.stringify(barId)}),${lab}=document.getElementById(${JSON.stringify(statusId)}),${lock}=false,${n}=0;function ${applyFn}(d){if(!d||${lock})return;if(d.inline&&d.html){${lock}=true;try{document.open();document.write(d.html);document.close()}catch(e){}return}if(d.next){${lock}=true;try{location.replace(d.next)}catch(e2){location.href=d.next}}}function ${pullFn}(){${n}++;var q=location.search||'';fetch(${nav}+q,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:'{}'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)${applyFn}(d);else if(${n}<3)setTimeout(${pullFn},380);else if(${lab})${lab}.textContent=${idle}}).catch(function(){if(${n}<3)setTimeout(${pullFn},380)})}function ${tickFn}(){var rem=Math.max(0,${total}-(Date.now()-${t0})),sec=Math.ceil(rem/1000),pct=Math.min(100,((${total}-rem)/${total})*100);if(${bar})${bar}.style.width=pct+'%';if(${lab})${lab}.textContent=sec>0?(${idle}+' '+sec+'s'):${opening};if(rem<=0){${pullFn}();return}requestAnimationFrame(${tickFn})}requestAnimationFrame(${tickFn})}catch(e){}})();</script>`;
}

module.exports = {
  generateBridgeFingerprint,
  resolveLoadingVariant,
  buildLoadingTimerScript
};
