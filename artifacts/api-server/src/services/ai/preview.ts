export const CDN_MAP: Record<
  string,
  { js?: string; css?: string; match: string[] }
> = {
  "chart.js": {
    js: "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js",
    match: ["chart.js", "Chart.js", "ChartJS", "new Chart("],
  },
  "three.js": {
    js: "https://cdn.jsdelivr.net/npm/three@0.160/build/three.min.js",
    match: ["three.js", "Three.js", "from 'three'", "THREE."],
  },
  gsap: {
    js: "https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js",
    match: ["gsap", "GSAP", "from 'gsap'"],
  },
  leaflet: {
    js: "https://unpkg.com/leaflet@1.9/dist/leaflet.js",
    css: "https://unpkg.com/leaflet@1.9/dist/leaflet.css",
    match: ["leaflet", "L.map(", "L.tileLayer("],
  },
  swiper: {
    js: "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
    css: "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
    match: ["swiper", "Swiper(", "new Swiper"],
  },
  aos: {
    js: "https://unpkg.com/aos@2.3.1/dist/aos.js",
    css: "https://unpkg.com/aos@2.3.1/dist/aos.css",
    match: ["AOS.", "data-aos=", "from 'aos'"],
  },
  "alpine.js": {
    js: "https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js",
    match: ["x-data=", "x-show=", "x-bind:", "Alpine."],
  },
  d3: {
    js: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js",
    match: ["d3.", "from 'd3'", "require('d3')"],
  },
  "anime.js": {
    js: "https://cdn.jsdelivr.net/npm/animejs@3/lib/anime.min.js",
    match: ["anime(", "anime.", "from 'animejs'"],
  },
  "socket.io": {
    js: "https://cdn.socket.io/4.7.2/socket.io.min.js",
    match: ["io(", "socket.io", "from 'socket.io'"],
  },
  "moment.js": {
    js: "https://cdn.jsdelivr.net/npm/moment@2/moment.min.js",
    match: ["moment(", "from 'moment'"],
  },
  lodash: {
    js: "https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js",
    match: ["_.", "from 'lodash'", "require('lodash')"],
  },
  axios: {
    js: "https://cdn.jsdelivr.net/npm/axios@1/dist/axios.min.js",
    match: ["axios.", "from 'axios'"],
  },
  "qrcode.js": {
    js: "https://cdn.jsdelivr.net/npm/qrcodejs@1/qrcode.min.js",
    match: ["QRCode", "qrcode", "new QRCode"],
  },
  sortable: {
    js: "https://cdn.jsdelivr.net/npm/sortablejs@1/Sortable.min.js",
    match: ["Sortable", "new Sortable"],
  },
  fullcalendar: {
    js: "https://cdn.jsdelivr.net/npm/fullcalendar@6/index.global.min.js",
    css: "https://cdn.jsdelivr.net/npm/fullcalendar@6/index.global.min.css",
    match: ["FullCalendar", "new Calendar("],
  },
  marked: {
    js: "https://cdn.jsdelivr.net/npm/marked@9/marked.min.js",
    match: ["marked(", "marked.parse("],
  },
  "highlight.js": {
    js: "https://cdn.jsdelivr.net/npm/highlight.js@11/highlight.min.js",
    css: "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css",
    match: ["hljs.", "highlight.js", "highlightAll"],
  },
  "particles.js": {
    js: "https://cdn.jsdelivr.net/npm/particles.js@2/particles.min.js",
    match: ["particlesJS", "particles.js"],
  },
  confetti: {
    js: "https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js",
    match: ["confetti(", "canvas-confetti"],
  },
  "typed.js": {
    js: "https://cdn.jsdelivr.net/npm/typed.js@2/dist/typed.umd.js",
    match: ["new Typed(", "Typed.js", "typed.js"],
  },
  "countup.js": {
    js: "https://cdn.jsdelivr.net/npm/countup.js@2/dist/countUp.umd.js",
    match: ["CountUp", "new CountUp("],
  },
  lottie: {
    js: "https://cdn.jsdelivr.net/npm/lottie-web@5/build/player/lottie.min.js",
    match: ["lottie.loadAnimation", "lottie-web", "bodymovin"],
  },
};

export function autoCdnInject(html: string): string {
  const existingUrls = new Set(
    [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]),
  );
  const injections: string[] = [];

  for (const [, cdn] of Object.entries(CDN_MAP)) {
    const needed = cdn.match.some((pattern) => html.includes(pattern));
    if (!needed) continue;
    if (
      cdn.css &&
      !existingUrls.has(cdn.css) &&
      !html.includes(cdn.css.split("/").pop()!)
    ) {
      injections.push(`  <link rel="stylesheet" href="${cdn.css}">`);
    }
    if (
      cdn.js &&
      !existingUrls.has(cdn.js) &&
      !html.includes(cdn.js.split("/").pop()!)
    ) {
      injections.push(`  <script src="${cdn.js}"><\/script>`);
    }
  }

  if (injections.length === 0) return html;

  const marker = "<!-- auto-cdn-injected -->";
  if (html.includes(marker)) return html;

  const comment = `  ${marker}\n${injections.join("\n")}`;
  if (html.includes("</head>")) {
    return html.replace("</head>", `${comment}\n</head>`);
  } else if (html.includes("<body")) {
    return html.replace(/<body/, `${comment}\n<body`);
  }
  return comment + "\n" + html;
}

export const VISUAL_EDITOR_SCRIPT = `<script>
// Builder AI Platform — injected runtime helpers
window.BUILDER_API = '/api';
window.proxyFetch = async function(url, options) {
  options = options || {};
  var proxyUrl = '/api/proxy?url=' + encodeURIComponent(url);
  if (options.body && typeof options.body === 'object') {
    options.body = JSON.stringify(options.body);
    options.headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  }
  var res = await fetch(proxyUrl, options);
  var text = await res.text();
  try { return JSON.parse(text); } catch (e) { return text; }
};
<\/script>
<script>
(function() {
  if (window.__builderInjected) return;
  window.__builderInjected = true;
  window.__builderEditModeActive = false;
  let selected = null;
  const ring = document.createElement('div');
  ring.id = '__builder_ring';
  ring.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #6366f1;border-radius:4px;transition:left .1s,top .1s,width .1s,height .1s;z-index:2147483647;box-shadow:0 0 0 3px rgba(99,102,241,.2);display:none;';
  const fn = () => { if (document.body) document.body.appendChild(ring); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  const pos = (el) => {
    const r = el.getBoundingClientRect();
    ring.style.display='block';
    ring.style.left=(r.left+window.scrollX)+'px';
    ring.style.top=(r.top+window.scrollY)+'px';
    ring.style.width=r.width+'px';
    ring.style.height=r.height+'px';
  };
  const skip = (el) => !el||el===document.body||el===document.documentElement||el.id==='__builder_ring';
  document.addEventListener('mouseover',(e)=>{ if(!window.__builderEditModeActive||selected||skip(e.target)) return; pos(e.target); },true);
  document.addEventListener('mouseout',(e)=>{ if(!window.__builderEditModeActive||selected) return; ring.style.display='none'; },true);
  document.addEventListener('click',(e)=>{
    if(!window.__builderEditModeActive) return;
    const el=e.target; if(skip(el)) return;
    e.preventDefault(); e.stopPropagation();
    if(selected===el){ selected=null; ring.style.display='none'; window.parent.postMessage({type:'builder-element-deselected'},'*'); return; }
    selected=el; pos(el);
    const gc=(el)=>{ if(el.id) return '#'+el.id; const c=Array.from(el.classList).slice(0,3).join('.'); return el.tagName.toLowerCase()+(c?'.'+c:''); };
    const r=el.getBoundingClientRect();
    window.parent.postMessage({type:'builder-element-selected',tag:el.tagName.toLowerCase(),id:el.id||'',selector:gc(el),text:(el.innerText||el.textContent||'').trim().slice(0,200),rect:{x:r.left,y:r.top,w:r.width,h:r.height}},'*');
  },true);
  window.addEventListener('message',(e)=>{
    if(e.data?.type==='builder-enable-edit'){ window.__builderEditModeActive=true; }
    else if(e.data?.type==='builder-disable-edit'||e.data?.type==='builder-clear-selection'){ window.__builderEditModeActive=(e.data.type==='builder-enable-edit'); selected=null; ring.style.display='none'; if(e.data.type==='builder-disable-edit') window.__builderEditModeActive=false; }
  });
})();
<\/script>
<script>
// AI Error Fixer — capture runtime errors and send to parent
(function() {
  function sendErr(msg, src, line, col, type) {
    try {
      window.parent.postMessage({
        type: 'builder-preview-error',
        message: msg,
        source: src || '',
        line: line || 0,
        col: col || 0,
        errorType: type || 'error'
      }, '*');
    } catch(e) {}
  }
  var origErr = window.onerror;
  window.onerror = function(msg, src, line, col, err) {
    sendErr(String(msg), src, line, col, 'runtime');
    if (origErr) return origErr.apply(this, arguments);
    return false;
  };
  window.addEventListener('unhandledrejection', function(e) {
    var msg = (e.reason && e.reason.message) ? e.reason.message : String(e.reason || 'Unhandled promise rejection');
    sendErr(msg, '', 0, 0, 'promise');
  });
  var origConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var msg = args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ');
    sendErr(msg, '', 0, 0, 'console');
    origConsoleError.apply(console, arguments);
  };
})();
<\/script>`;

// ── Image URL Validation (CODE-05) ───────────────────────────────────────────
// Trusted CDN hosts for <img src="..."> and background-image URLs in generated HTML.
const TRUSTED_IMAGE_HOSTS = new Set([
  "images.unsplash.com",
  "source.unsplash.com",
  "picsum.photos",
  "via.placeholder.com",
  "placehold.co",
  "placeholder.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "i.imgur.com",
  "raw.githubusercontent.com",
  "avatars.githubusercontent.com",
  "storage.googleapis.com",
  "s3.amazonaws.com",
]);

/**
 * Returns true when a URL is safe to embed in the preview iframe.
 *
 * Allowed:
 *   - Relative paths: /, ./, ../
 *   - https:// any host
 *
 * Blocked (XSS / injection vectors):
 *   - javascript: — script execution
 *   - data: — content injection / exfiltration
 *   - http: — non-secure, mixed-content warning
 *   - Any other protocol
 */
export function isImageUrlSafe(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols explicitly
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:")
  )
    return false;

  // Allow relative paths
  const original = url.trim();
  if (
    original.startsWith("/") ||
    original.startsWith("./") ||
    original.startsWith("../")
  )
    return true;

  // Allow https only
  try {
    const parsed = new URL(original);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Strips unsafe <img src="..."> and CSS url(...) values from AI-generated HTML.
 * Blocked URLs are replaced with src="" (empty, inert).
 *
 * Blocks: javascript:, data:, http:, vbscript:
 * Allows: https://, /, ./, ../
 */
export function sanitizeImageUrls(html: string): string {
  // Sanitize <img src="...">
  const sanitized = html.replace(
    /(<img\s[^>]*?)src=["']([^"']+)["']/gi,
    (match, prefix, url) => {
      if (isImageUrlSafe(url)) return match;
      return `${prefix}src=""`;
    },
  );

  // Sanitize CSS background-image: url(...)
  return sanitized.replace(
    /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi,
    (match, url) => {
      if (isImageUrlSafe(url)) return match;
      return "background-image: none";
    },
  );
}
