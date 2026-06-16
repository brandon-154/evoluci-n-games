// ═══════════════════════════════════════════════
//  EVOLUCIÓN GAMES B&R — app.js v2
//  Reescrito: Firebase centralizado, sin duplicación
//  localStorage, sincronización en tiempo real.
// ═══════════════════════════════════════════════
import { fbLoad, fbSave, fbListen } from './firebase.js';

/* ────────────────────────────────────────────
   UTILS
──────────────────────────────────────────── */
function sh(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h.toString(16);
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hl(text, q) {
  if (!q) return text;
  return text.replace(
    new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
    '<mark>$1</mark>'
  );
}

function fmtFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/* ────────────────────────────────────────────
   ESTADO GLOBAL (se inicializa desde Firebase)
──────────────────────────────────────────── */
// GDB y GDB_DEFAULT vienen de data/games.js
let GIMGS    = {};
let ARTS     = [];
let FISI     = [];
let REPS     = [];
let INGRESOS = [];
let ADMINS   = [];
let GUIDES   = [];
let GENRES   = {};

const DEFAULT_REPS = [
  { id: 1, name: 'Flasheo PS4 Fat/Slim/Pro', console: 'PS4', price: 'Desde 80 Bs.', desc: 'Versiones 9.00 en adelante. Incluye revisión previa.' },
  { id: 2, name: 'Flasheo PS5', console: 'PS5', price: 'Consultar', desc: 'Consulta tu versión antes.' },
  { id: 3, name: 'Chipeado Nintendo Switch', console: 'Switch', price: 'Desde 120 Bs.', desc: 'Modchip Picofly o RCM según modelo.' },
  { id: 4, name: 'Mantenimiento PS4', console: 'PS4', price: '50 Bs.', desc: 'Limpieza, pasta térmica y revisión.' },
  { id: 5, name: 'Mantenimiento PS5', console: 'PS5', price: '70 Bs.', desc: 'Limpieza completa y enfriamiento.' },
  { id: 6, name: 'Reparación HDMI PS4/PS5', console: 'PS4/PS5', price: 'Desde 60 Bs.', desc: 'Cambio de puerto HDMI dañado.' },
  { id: 7, name: 'Carga de juegos PS4', console: 'PS4', price: '15 Bs. x juego', desc: 'Instalación en disco duro.' },
  { id: 8, name: 'Carga de juegos PS3', console: 'PS3', price: '10 Bs. x juego', desc: 'PKG o backup.' },
];

const DEFAULT_GUIDES = [
  { id: 1, console: 'PS4', title: 'Flasheo PS4 — v9.00 a 11.00', desc: 'HEN vía exploit web', steps: ['Verifica que el PS4 esté en versión 9.00, 9.03, 9.04 o 11.00.', 'Ve a Configuración → Red → Configurar conexión a Internet.', 'Elige Wi-Fi o LAN, método Personalizado.', 'DNS Primario: 165.227.83.145 · DNS Secundario: 8.8.8.8.', 'Continúa hasta el final y prueba la conexión.', 'Abre el navegador del PS4 y accede al sitio del exploit.', 'Sigue las instrucciones en pantalla.', 'Con el HEN activo ya puedes cargar juegos backup.'] },
  { id: 2, console: 'PS4', title: 'Flasheo PS4 — v11.02 a 13.00', desc: 'Vía USB/disco instalador', steps: ['Necesitas un USB formateado en FAT32.', 'Copia el archivo PKG del exploit al USB.', 'Inserta el USB en el PS4.', 'Ve a Ajustes → Dispositivos de almacenamiento USB.', 'Instala el PKG desde el explorador.', 'Sigue los pasos del instalador.', 'Reinicia el PS4 cuando se indique.', 'El exploit quedará activo.'] },
  { id: 3, console: 'PS3', title: 'Flasheo PS3 — CFW/HFW', desc: 'Multiman vía internet o USB', steps: ['Verifica compatibilidad (Fat/Slim hasta v4.82).', 'Descarga el HFW para tu versión.', 'Instálalo desde Ajustes → Sistema → Actualización.', 'Instala PS3HEN desde el navegador del PS3.', 'Activa HEN cada vez que enciendas la consola.', 'Instala Multiman PKG para gestionar backups.', 'Los juegos van en ISO o carpeta GAMEZ en el HDD.'] },
  { id: 4, console: 'Switch', title: 'Chipeado Nintendo Switch — Picofly', desc: 'Modchip para cualquier versión', steps: ['Requiere apertura física de la consola.', 'Se instala el modchip Picofly en la placa.', 'Compatible con todas las versiones incluidas las parchadas.', 'Arranca automáticamente con CFW Atmosphere.', 'Los juegos van en microSD en formato NSP o XCI.', 'No requiere pasos manuales al encender.'] },
  { id: 5, console: 'Switch', title: 'Nintendo Switch — Modo RCM', desc: 'Solo modelos no parchados', steps: ['Solo para Switch sin parche (pre-2018 aprox).', 'Apaga completamente la Switch.', 'Inserta el jig RCM en los pines del Joy-Con derecho.', 'Mantén Vol+ y presiona Power para entrar en RCM.', 'Conecta al PC y usa TegraRcmGUI para inyectar payload.', 'Arranca Atmosphere automáticamente.', 'Los juegos van en la microSD.'] },
];

const GENRE_LIST = ['Aventura', 'Acción', 'Terror', 'Deportes', 'Multijugador', 'RPG'];
const CONSOLE_ORDER = ['PS4', 'PS5', 'PS3', 'Switch', 'PSP', 'PSVita', 'PS2', 'Xbox360', 'Wii'];
function orderedConsoles() {
  const keys = orderedConsoles();
  return [
    ...CONSOLE_ORDER.filter(c => keys.includes(c)),
    ...keys.filter(c => !CONSOLE_ORDER.includes(c))
  ];
}

const WHATSAPP_NUMBERS = {
  principal: '59160110595',
  papa: '59170000001'
};

/* ────────────────────────────────────────────
   SESIÓN (sessionStorage — solo en el navegador)
──────────────────────────────────────────── */
let role = sessionStorage.getItem('eg_role') || 'guest';

/* ────────────────────────────────────────────
   UI STATE
──────────────────────────────────────────── */
let aCon = 'PS4', aDisk = 'Todos';
let aArtCat = 'Todos', aRepCon = 'Todos';
let pCon = 'PS4', pOpt = 'all';
let editGameData = null;
let editGuideId = null;
let currentDiskModalInfo = null;
let activeClientGenre = 'Todos';

/* ────────────────────────────────────────────
   LOADER OVERLAY
──────────────────────────────────────────── */
function showLoader(msg = 'Cargando...') {
  const el = document.getElementById('app-loader');
  if (!el) return;
  el.querySelector('p').textContent = msg;
  el.style.display = 'flex';
}
function hideLoader() {
  const el = document.getElementById('app-loader');
  if (el) el.style.display = 'none';
}

/* ────────────────────────────────────────────
   FIREBASE — GUARDAR (todas las colecciones)
──────────────────────────────────────────── */
async function saveAll() {
  invalidateCache(); // próxima página recargará datos frescos
  // Guarda en paralelo todos los datos
  const saves = [
    fbSave('catalogo', window.GDB),
    fbSave('imagenes', GIMGS),
    fbSave('articulos', { items: ARTS }),
    fbSave('fisicos', { items: FISI }),
    fbSave('reparaciones', { items: REPS }),
    fbSave('guias', { items: GUIDES }),
    fbSave('genres', GENRES),
  ];
  // Ingresos y admins solo los guarda el admin
  if (role === 'admin') {
    saves.push(fbSave('ingresos', { items: INGRESOS }));
    saves.push(fbSave('admins', { items: ADMINS }));
  }
  try {
    await Promise.all(saves);
  } catch (e) {
    toast('Error al guardar en la nube ☁️', 'e');
    console.error('[save]', e);
  }
}

// save() — wrapper que llama saveAll y refresca la UI
function save() { saveAll(); }

/* ────────────────────────────────────────────
   ARRANQUE — carga Firebase y escucha cambios
──────────────────────────────────────────── */
/* ────────────────────────────────────────────
   CACHÉ en sessionStorage — clave compartida entre páginas
──────────────────────────────────────────── */
const CACHE_KEY = 'eg_cache_v1';
const CACHE_TTL = 60 * 1000; // 60 segundos máximo antes de refrescar

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null; // expirado
    return data;
  } catch { return null; }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* sin espacio — ignorar */ }
}

function invalidateCache() {
  sessionStorage.removeItem(CACHE_KEY);
}

// Llama invalidateCache() cuando se guarda algo
const _originalSaveAll = saveAll;

async function init() {
  const cached = readCache();

  if (cached) {
    // ── MODO RÁPIDO: datos desde caché, sin loader ──
    applyData(cached);
    hideLoader();
    initPage();
    if (role === 'admin') applyAdminUI(sessionStorage.getItem('eg_admin_name') || 'Administrador');
    // Refresca Firebase en segundo plano silenciosamente
    refreshFromFirebase();
    return;
  }

  // ── PRIMERA CARGA: muestra loader, carga Firebase ──
  showLoader('Conectando con la nube...');
  await loadFromFirebase();
  hideLoader();

  if (role === 'admin') applyAdminUI(sessionStorage.getItem('eg_admin_name') || 'Administrador');
  initPage();
  startListeners();
}

// ── Carga todos los datos desde Firebase y guarda en caché ──
async function loadFromFirebase() {
  const [catData, imgData, artData, fisData, repData, guiData, genData, admData, ingData] =
    await Promise.all([
      fbLoad('catalogo', window.GDB_DEFAULT),
      fbLoad('imagenes', {}),
      fbLoad('articulos', { items: [] }),
      fbLoad('fisicos', { items: [] }),
      fbLoad('reparaciones', { items: DEFAULT_REPS }),
      fbLoad('guias', { items: DEFAULT_GUIDES }),
      fbLoad('genres', {}),
      fbLoad('admins', { items: [{ user: 'admin', pass: sh('admin123'), display: 'Administrador Principal' }] }),
      fbLoad('ingresos', { items: [] }),
    ]);

  applyData({ catData, imgData, artData, fisData, repData, guiData, genData, admData, ingData });
  writeCache({ catData, imgData, artData, fisData, repData, guiData, genData, admData, ingData });
}

// ── Aplica datos al estado global ──
function applyData({ catData, imgData, artData, fisData, repData, guiData, genData, admData, ingData }) {
  if (catData) window.GDB = catData;
  if (imgData) GIMGS = imgData;
  if (artData?.items) ARTS = artData.items;
  if (fisData?.items) FISI = fisData.items;
  if (repData?.items) REPS = repData.items;
  if (guiData?.items) GUIDES = guiData.items;
  if (genData) GENRES = genData;
  if (admData?.items) ADMINS = admData.items;
  if (ingData?.items) INGRESOS = ingData.items;
}

// ── Refresca en segundo plano sin mostrar loader ──
async function refreshFromFirebase() {
  try {
    await loadFromFirebase();
    // Refresca la UI silenciosamente si algo cambió
    if (document.getElementById('ctabs')) { iCat(); renderDashboard(); }
    if (document.getElementById('client-console-grid')) renderClientConsoles();
    if (document.getElementById('client-ggrid')) renderClientGames();
    if (document.getElementById('agrid')) { rACats(); rA(); }
    if (document.getElementById('fgrid')) rF();
    if (document.getElementById('rgrid')) { rRFil(); rR(); }
    if (document.getElementById('flasgrid')) rFlash();
    if (document.getElementById('ing-list')) rIngresos();
  } catch { /* silencioso */ }
}

// ── Listeners en tiempo real (solo para sync entre dispositivos) ──
function startListeners() {
  fbListen('catalogo', (data) => {
    window.GDB = data;
    invalidateCache(); // fuerza recarga en próxima página
    if (document.getElementById('ctabs')) { iCat(); renderDashboard(); }
    if (document.getElementById('client-console-grid')) renderClientConsoles();
    if (document.getElementById('client-ggrid')) renderClientGames();
  });
  fbListen('imagenes', (data) => {
    GIMGS = data;
    if (document.getElementById('ggrid')) rG();
    if (document.getElementById('client-ggrid')) renderClientGames();
  });
  fbListen('articulos', (data) => {
    if (data?.items) { ARTS = data.items; if (document.getElementById('agrid')) rA(); }
  });
  fbListen('fisicos', (data) => {
    if (data?.items) { FISI = data.items; if (document.getElementById('fgrid')) rF(); }
  });
  fbListen('reparaciones', (data) => {
    if (data?.items) { REPS = data.items; if (document.getElementById('rgrid')) { rRFil(); rR(); } }
  });
  fbListen('guias', (data) => {
    if (data?.items) { GUIDES = data.items; if (document.getElementById('flasgrid')) rFlash(); }
  });
  fbListen('genres', (data) => {
    GENRES = data;
    if (document.getElementById('client-ggrid')) renderClientGames();
  });
}

function initPage() {
  // Catálogo admin
  if (document.getElementById('ctabs')) { iCat(); updateWorklistBadge(); }
  // Catálogo clientes (consolas)
  if (document.getElementById('client-console-grid')) renderClientConsoles();
  // Catálogo clientes (juegos por consola)
  if (document.getElementById('client-ggrid')) { updateCartBadge(); renderClientGames(); }
  // Artículos
  if (document.getElementById('agrid')) { rACats(); rA(); }
  // Físicos
  if (document.getElementById('fgrid')) rF();
  // Reparaciones
  if (document.getElementById('rgrid')) { rRFil(); rR(); }
  // Flasheo
  if (document.getElementById('flasgrid')) rFlash();
  // Ingresos
  if (document.getElementById('ing-list')) rIngresos();
  // Admin users
  if (document.getElementById('ulist')) rUsers();
  // Imprimir
  if (document.getElementById('print-con-tabs')) iPrint();
  // Dashboard
  if (document.getElementById('dash-total-games')) renderDashboard();
  // Cart badge
  updateCartBadge();
  // Worklist badge
  updateWorklistBadge();
}

/* ────────────────────────────────────────────
   DARK MODE
──────────────────────────────────────────── */
function initDarkMode() {
  const saved = localStorage.getItem('eg_dark');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved !== null ? saved === '1' : prefersDark;
  document.documentElement.classList.toggle('dark', isDark);
  updateDarkToggle(isDark);
}

function toggleDark() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('eg_dark', isDark ? '1' : '0');
  updateDarkToggle(isDark);
}

function updateDarkToggle(isDark) {
  document.querySelectorAll('.dark-toggle').forEach(btn => {
    btn.innerHTML = isDark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
    btn.title = isDark ? 'Modo claro' : 'Modo oscuro';
  });
}

/* ────────────────────────────────────────────
   TOAST
──────────────────────────────────────────── */
let TT;
function toast(msg, t = 's') {
  const el = document.getElementById('toast');
  const m = document.getElementById('tmsg');
  const ic = el?.querySelector('i');
  if (!el || !m) return;
  m.textContent = msg;
  el.className = 'on ' + t;
  if (ic) ic.className = t === 's' ? 'fas fa-check-circle' : 'fas fa-times-circle';
  clearTimeout(TT);
  TT = setTimeout(() => el.classList.remove('on'), 3500);
}

/* ────────────────────────────────────────────
   MODAL HELPERS
──────────────────────────────────────────── */
function oMod(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('op');
  document.body.style.overflow = 'hidden';
}
function cMod(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('op');
  // Solo restaura scroll si no hay otro modal abierto
  if (!document.querySelector('.ov.op')) document.body.style.overflow = '';
}

/* ────────────────────────────────────────────
   AUTH
──────────────────────────────────────────── */
function doLogin() {
  const u = document.getElementById('lu')?.value.trim().toLowerCase();
  const p = document.getElementById('lp')?.value;
  const err = document.getElementById('lerr');
  const found = ADMINS.find(a => a.user === u && a.pass === sh(p));
  if (!found) {
    err?.classList.add('on');
    document.getElementById('lp').value = '';
    return;
  }
  role = 'admin';
  sessionStorage.setItem('eg_role', 'admin');
  sessionStorage.setItem('eg_admin_name', found.display);
  err?.classList.remove('on');
  cMod('m-login');
  applyAdminUI(found.display);
  toast('¡Bienvenido, ' + found.display + '! 👑', 's');
}

function applyAdminUI(displayName) {
  document.body.classList.add('is-admin');
  const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'block'; };
  const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  const showF = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'flex'; };
  hide('btn-login-nav');
  hide('btn-login-hint');
  document.getElementById('btn-logout')?.classList.add('on');
  show('mb-au'); show('mb-ing');
  showF('ba-add'); showF('bf-add'); showF('br-add');
  hide('no-access');
  const ingC = document.getElementById('ingresos-content');
  if (ingC) { ingC.style.display = 'block'; if (typeof rIngresos === 'function') rIngresos(); }
  const auC = document.getElementById('adminusers-content');
  if (auC) { auC.style.display = 'block'; if (typeof rUsers === 'function') rUsers(); }
  const printC = document.getElementById('imprimir-content');
  if (printC) { printC.style.display = 'block'; if (typeof iPrint === 'function') iPrint(); }
}

function doLogout() {
  role = 'guest';
  sessionStorage.removeItem('eg_role');
  sessionStorage.removeItem('eg_admin_name');
  document.body.classList.remove('is-admin');
  const show = (id) => { const el = document.getElementById(id); if (el) el.style.display = ''; };
  const hide = (id) => { const el = document.getElementById(id); if (el) el.style.display = 'none'; };
  show('btn-login-nav');
  show('btn-login-hint');
  document.getElementById('btn-logout')?.classList.remove('on');
  hide('mb-au'); hide('mb-ing');
  hide('ba-add'); hide('bf-add'); hide('br-add');
  toast('Sesión cerrada', 's');
  if (document.body.dataset.adminOnly === 'true') {
    setTimeout(() => { window.location.href = document.body.dataset.adminRedirect || 'puesto.html'; }, 600);
  }
}

/* ────────────────────────────────────────────
   DASHBOARD
──────────────────────────────────────────── */
function renderDashboard() {
  if (!document.getElementById('dash-total-games')) return;
  const totalGames = Object.values(window.GDB || {}).reduce((s, discos) =>
    s + Object.values(discos).flat().length, 0);
  const el = document.getElementById('dash-total-games');
  if (el) el.textContent = totalGames;

  // Juegos por consola
  const byConsole = document.getElementById('dash-by-console');
  if (byConsole) {
    byConsole.innerHTML = Object.entries(window.GDB || {}).map(([con, discos]) => {
      const n = Object.values(discos).flat().length;
      return `<div class="dash-con-row"><i class="${cIco(con)}"></i><span>${con}</span><strong>${n}</strong></div>`;
    }).join('');
  }

  // Juegos recientes (últimos 10 agregados al catálogo no es posible sin timestamps,
  // pero mostramos los últimos en el último disco de cada consola)
  const recentEl = document.getElementById('dash-recent');
  if (recentEl) {
    let recent = [];
    Object.entries(window.GDB || {}).forEach(([con, discos]) => {
      Object.entries(discos).forEach(([disk, games]) => {
        if (games.length) {
          const last = games[games.length - 1];
          recent.push({ con, disk, name: last });
        }
      });
    });
    recent = recent.slice(-8).reverse();
    recentEl.innerHTML = recent.length
      ? recent.map(g => `<div class="dash-recent-row"><i class="${cIco(g.con)}"></i><span>${g.name}</span><small>${g.con}</small></div>`).join('')
      : '<p style="color:var(--mu);font-size:.8rem">Sin juegos aún.</p>';
  }
}

/* ────────────────────────────────────────────
   CONSOLA — helpers
──────────────────────────────────────────── */
function cIco(c) {
  if (c.startsWith('PS')) return 'fab fa-playstation';
  if (c === 'Switch' || c === 'Wii') return 'fas fa-gamepad';
  return 'fab fa-xbox';
}

function getGenre(name) { return GENRES[name] || 'Sin clasificar'; }

/* ────────────────────────────────────────────
   CATÁLOGO ADMIN
──────────────────────────────────────────── */
function iCat() {
  const tabs = document.getElementById('ctabs');
  if (!tabs) return;
  tabs.innerHTML = orderedConsoles().map(c => {
    const n = Object.values(window.GDB[c] || {}).flat().length;
    return `<div class="ctab ${c === aCon ? 'on' : ''}" onclick="setCon('${c}')">
      <i class="${cIco(c)}"></i> ${c}${n ? `<span class="cn">${n}</span>` : ''}
    </div>`;
  }).join('');
  aDisk = 'Todos';
  renderDiskTabs();
  rG();
}

function renderDiskTabs() {
  const wrap = document.getElementById('disktabs');
  if (!wrap) return;
  const disks = Object.keys(window.GDB[aCon] || {});
  let html = `<div class="ctab ${aDisk === 'Todos' ? 'on' : ''}" onclick="setDisk('Todos')"><i class="fas fa-layer-group"></i> Todos</div>`;
  html += disks.map(d =>
    `<div class="ctab ${aDisk === d ? 'on' : ''}" onclick="setDisk('${escAttr(d)}')">
      <i class="fas fa-hdd"></i> ${d}<span class="cn">${(window.GDB[aCon][d] || []).length}</span>
    </div>`).join('');
  if (role === 'admin') {
    html += `<div class="ctab" style="border-color:rgba(124,58,237,.35);color:#a78bfa" onclick="openManageDisks()">
      <i class="fas fa-sliders-h"></i> Gestionar discos
    </div>`;
  }
  wrap.innerHTML = html;
}

function setCon(c) { aCon = c; document.getElementById('sinp').value = ''; iCat(); }
function setDisk(d) { aDisk = d; renderDiskTabs(); rG(); }

function rG() {
  const q = document.getElementById('sinp')?.value.trim().toLowerCase() || '';
  const discos = window.GDB[aCon] || {};
  let all = [];
  const seen = new Set();
  Object.entries(discos).forEach(([disk, gs]) => gs.forEach(g => {
    const key = g.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    all.push({ name: g, disk });
  }));
  if (aDisk !== 'Todos') all = all.filter(g => g.disk === aDisk);
  all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const fil = q ? all.filter(g => g.name.toLowerCase().includes(q)) : all;

  const sc = document.getElementById('sc');
  if (sc) sc.textContent = fil.length + ' juego' + (fil.length !== 1 ? 's' : '');
  const grid = document.getElementById('ggrid');
  if (!grid) return;

  if (!all.length) {
    grid.innerHTML = `<div class="empty"><i class="fas fa-compact-disc"></i><p>Sin juegos para <strong>${aCon}</strong>${aDisk !== 'Todos' ? ' en ' + aDisk : ''}.</p></div>`;
    return;
  }
  if (!fil.length) {
    grid.innerHTML = `<div class="empty"><i class="fas fa-search"></i><p>No se encontró "<strong>${q}</strong>".</p></div>`;
    return;
  }

  grid.innerHTML = fil.map(g => {
    const img = GIMGS[aCon + '::' + g.name] || '';
    const nameAttr = escAttr(g.name);
    const diskAttr = escAttr(g.disk);
    return `<div class="gc">
      <div class="gc-imgw">
        <div class="gc-actions">
          <button type="button" class="ca-btn cam" data-act="upload-game" data-con="${aCon}" data-name="${nameAttr}" title="Portada"><i class="fas fa-camera"></i></button>
          <button type="button" class="ca-btn edit" data-act="edit-game" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}" title="Editar"><i class="fas fa-pen"></i></button>
          <button type="button" class="ca-btn del" data-act="del-game" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${img
          ? `<img src="${img}" alt="${nameAttr}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/>`
          : `<div class="gc-ph"><i class="fas fa-compact-disc"></i><span style="font-size:.6rem">${g.name.substring(0, 18)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="gimg-${btoa(encodeURIComponent(g.name)).replace(/[^a-zA-Z0-9]/g, '')}" data-con="${aCon}" data-name="${nameAttr}" onchange="saveGameImg(this.dataset.con,this.dataset.name,this)"/>
      </div>
      <div class="gc-body" data-act="open-disk" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}">
        <div class="gc-name">${hl(g.name, q)}</div>
        <div class="gc-disk"><span class="dbadge"><i class="fas fa-hdd"></i> ${g.disk}</span></div>
      </div>
    </div>`;
  }).join('');
}

/* ── Gestionar discos ── */
function openManageDisks() {
  document.getElementById('md-con').textContent = aCon;
  renderManageDisksList();
  oMod('m-manage-disks');
}
function renderManageDisksList() {
  const disks = Object.keys(window.GDB[aCon] || {});
  const wrap = document.getElementById('md-list');
  if (!wrap) return;
  wrap.innerHTML = disks.length
    ? disks.map(d => `
      <div class="urow" style="margin-bottom:8px">
        <div class="uav" style="background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.25);color:var(--cy)"><i class="fas fa-hdd"></i></div>
        <div class="ui"><div class="un">${d}</div><div class="ur">${(window.GDB[aCon][d] || []).length} juego(s)</div></div>
        <button class="sbtn dl" onclick="deleteDisk('${escAttr(d)}')"><i class="fas fa-trash"></i> Eliminar</button>
      </div>`).join('')
    : `<p style="font-size:.8rem;color:var(--mu);text-align:center;padding:16px 0">Sin discos registrados para ${aCon} todavía.</p>`;
}
function addDisk() {
  const inp = document.getElementById('md-new');
  let name = inp?.value.trim();
  if (!name) { toast('Escribe un nombre para el disco', 'e'); return; }
  if (!/^disco/i.test(name)) name = 'DISCO ' + name;
  if (!window.GDB[aCon]) window.GDB[aCon] = {};
  if (window.GDB[aCon][name]) { toast('Ese disco ya existe', 'e'); return; }
  window.GDB[aCon][name] = [];
  save(); if (inp) inp.value = '';
  renderManageDisksList(); renderDiskTabs();
  toast('"' + name + '" agregado a ' + aCon + ' ✅', 's');
}
function deleteDisk(name) {
  const games = window.GDB[aCon]?.[name] || [];
  const msg = games.length
    ? `"${name}" tiene ${games.length} juego(s). ¿Eliminar el disco y todos sus juegos?`
    : `¿Eliminar "${name}"?`;
  if (!confirm(msg)) return;
  games.forEach(g => delete GIMGS[aCon + '::' + g]);
  delete window.GDB[aCon][name];
  save();
  if (aDisk === name) aDisk = 'Todos';
  renderManageDisksList(); renderDiskTabs(); rG();
  toast('"' + name + '" eliminado', 's');
}

/* ── Disk detail modal ── */
function openDiskModal(con, disk, clickedName) {
  currentDiskModalInfo = { con, disk };
  const games = window.GDB[con]?.[disk] || [];
  document.getElementById('dm-title').textContent = disk + ' — ' + con;
  document.getElementById('dm-count').textContent = games.length + ' juegos en este disco' + (role === 'admin' ? ' · flechas para reordenar' : '');
  const list = document.getElementById('dm-list');
  list.innerHTML = games.map((g, i) => {
    const isHL = clickedName && g.toLowerCase() === clickedName.toLowerCase();
    const reorderBtns = role === 'admin' ? `
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
        <button type="button" class="dli-move" onclick="moveDiskGame(${i},-1)" ${i === 0 ? 'disabled' : ''} title="Subir"><i class="fas fa-chevron-up"></i></button>
        <button type="button" class="dli-move" onclick="moveDiskGame(${i},1)" ${i === games.length - 1 ? 'disabled' : ''} title="Bajar"><i class="fas fa-chevron-down"></i></button>
      </div>` : '';
    return `<div class="disk-list-item ${isHL ? 'highlighted' : ''}" id="dli-${i}">
      ${reorderBtns}
      <span class="dli-num">${i + 1}</span>
      <span class="dli-name">${g}</span>
      ${isHL ? '<i class="fas fa-arrow-left" style="color:var(--cy);font-size:.75rem"></i>' : ''}
    </div>`;
  }).join('');
  oMod('m-disk');
  if (clickedName) {
    setTimeout(() => {
      list.querySelector('.highlighted')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  }
}
function moveDiskGame(index, dir) {
  if (!currentDiskModalInfo) return;
  const { con, disk } = currentDiskModalInfo;
  const arr = window.GDB[con]?.[disk];
  if (!arr) return;
  const ni = index + dir;
  if (ni < 0 || ni >= arr.length) return;
  [arr[index], arr[ni]] = [arr[ni], arr[index]];
  save(); openDiskModal(con, disk, null);
  rG();
}

/* ── Upload game image ── */
function uploadGameImg(con, name) {
  const safeId = btoa(encodeURIComponent(name)).replace(/[^a-zA-Z0-9]/g, '');
  document.getElementById('gimg-' + safeId)?.click();
}
function saveGameImg(con, name, input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    GIMGS[con + '::' + name] = ev.target.result;
    save(); rG(); toast('Imagen guardada ✅', 's');
  };
  r.readAsDataURL(file);
}

/* ── Add/Edit game ── */
function refreshDiskOptions(con, selectedDisk) {
  const sel = document.getElementById('ag-d');
  if (!sel) return;
  let disks = Object.keys(window.GDB[con] || {});
  if (!disks.length) { if (!window.GDB[con]) window.GDB[con] = {}; window.GDB[con]['DISCO 1'] = []; disks = ['DISCO 1']; }
  sel.innerHTML = disks.map(d => `<option value="${escAttr(d)}">${d}</option>`).join('')
    + `<option value="__new__">+ Crear nuevo disco...</option>`;
  if (selectedDisk && disks.includes(selectedDisk)) sel.value = selectedDisk;
  else sel.value = disks[0];
}
function onAgDiskChange() {
  const sel = document.getElementById('ag-d');
  if (!sel || sel.value !== '__new__') return;
  const name = prompt('Nombre del nuevo disco (ej: DISCO 8):');
  const con = document.getElementById('ag-c')?.value;
  if (name && name.trim() && con) {
    const clean = /^disco/i.test(name.trim()) ? name.trim() : 'DISCO ' + name.trim();
    if (!window.GDB[con]) window.GDB[con] = {};
    if (!window.GDB[con][clean]) window.GDB[con][clean] = [];
    save(); refreshDiskOptions(con, clean);
  } else {
    refreshDiskOptions(con || aCon);
  }
}
function onAgConsoleChange() { refreshDiskOptions(document.getElementById('ag-c')?.value); }
function openAddGame() {
  editGameData = null;
  document.getElementById('ag-tit').textContent = 'Agregar Juego';
  document.getElementById('ag-ico').className = 'fas fa-plus';
  document.getElementById('ag-n').value = '';
  document.getElementById('ag-c').value = aCon;
  document.getElementById('ag-genre').value = '';
  refreshDiskOptions(aCon, aDisk !== 'Todos' ? aDisk : null);
  resetCoverTabs();
  oMod('m-ag');
  setTimeout(() => document.getElementById('ag-n')?.focus(), 100);
}
function editGame(con, disk, name) {
  editGameData = { con, disk, name };
  document.getElementById('ag-tit').textContent = 'Editar Juego';
  document.getElementById('ag-ico').className = 'fas fa-pen';
  document.getElementById('ag-n').value = name;
  document.getElementById('ag-c').value = con;
  document.getElementById('ag-genre').value = GENRES[name] || '';
  refreshDiskOptions(con, disk);
  resetCoverTabs();
  const img = GIMGS[con + '::' + name] || '';
  if (img) {
    document.getElementById('ag-img-b64').value = img;
    document.getElementById('cover-selected-img').src = img;
    document.getElementById('cover-selected-wrap').style.display = 'block';
  }
  oMod('m-ag');
}
function saveGame() {
  const newName = document.getElementById('ag-n')?.value.trim();
  const con = document.getElementById('ag-c')?.value;
  const disk = document.getElementById('ag-d')?.value;
  const img = document.getElementById('ag-img-b64')?.value;
  const genre = document.getElementById('ag-genre')?.value;
  if (!newName) { toast('Escribe el nombre del juego', 'e'); return; }
  if (!con || !disk || disk === '__new__') { toast('Selecciona un disco válido', 'e'); return; }
  if (!window.GDB[con]) window.GDB[con] = {};
  if (!window.GDB[con][disk]) window.GDB[con][disk] = [];

  // Verificar duplicados
  const allGames = Object.values(window.GDB[con]).flat().map(g => g.toLowerCase());
  const isDuplicate = allGames.includes(newName.toLowerCase());

  if (editGameData) {
    // Quitar el juego anterior
    window.GDB[editGameData.con][editGameData.disk] = window.GDB[editGameData.con][editGameData.disk].filter(g => g !== editGameData.name);
    delete GIMGS[editGameData.con + '::' + editGameData.name];
    if (editGameData.name !== newName) delete GENRES[editGameData.name];
  } else if (isDuplicate) {
    toast('"' + newName + '" ya está en el catálogo de ' + con, 'e');
    return;
  }

  if (!window.GDB[con][disk].includes(newName)) window.GDB[con][disk].push(newName);
  if (img) GIMGS[con + '::' + newName] = img;
  if (genre) GENRES[newName] = genre; else delete GENRES[newName];

  save();
  cMod('m-ag');
  resetImgField('ag-img-file', 'ag-img-prev', 'ag-img-b64');
  if (con === aCon) { rG(); iCat(); }
  toast(newName + (editGameData ? ' actualizado' : ' agregado') + ' ✅', 's');
  editGameData = null;
}
function delGame(con, disk, name) {
  if (!confirm('¿Eliminar "' + name + '" de ' + disk + '?')) return;
  window.GDB[con][disk] = window.GDB[con][disk].filter(g => g !== name);
  delete GIMGS[con + '::' + name];
  delete GENRES[name];
  save(); rG(); iCat();
  toast('"' + name + '" eliminado', 's');
}

/* ── Event delegation para catalog grid ── */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('ggrid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const { act, con, disk, name } = el.dataset;
    if (act === 'upload-game') uploadGameImg(con, name);
    else if (act === 'edit-game') editGame(con, disk, name);
    else if (act === 'del-game') delGame(con, disk, name);
    else if (act === 'open-disk') openDiskModal(con, disk, name);
  });
});

/* ────────────────────────────────────────────
   PORTADAS AUTOMÁTICAS (RAWG)
──────────────────────────────────────────── */
function switchCoverTab(tab) {
  const isManual = tab === 'manual';
  document.getElementById('cover-manual').style.display = isManual ? 'block' : 'none';
  document.getElementById('cover-auto').style.display = isManual ? 'none' : 'block';
  document.getElementById('tab-manual').classList.toggle('on', isManual);
  document.getElementById('tab-auto').classList.toggle('on', !isManual);
  if (!isManual) {
    const q = document.getElementById('ag-n')?.value.trim();
    if (q) buscarPortadaAuto();
  }
}
async function buscarPortadaAuto() {
  const name = document.getElementById('ag-n')?.value.trim();
  if (!name) { toast('Escribe el nombre del juego primero', 'e'); return; }
  const status = document.getElementById('cover-status');
  const results = document.getElementById('cover-results');
  if (status) status.textContent = '🔍 Buscando portada...';
  if (results) results.innerHTML = '';
  try {
    const res = await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(name)}&page_size=6&key=`);
    const data = await res.json();
    const games = (data.results || []).filter(g => g.background_image);
    if (!games.length) {
      if (status) status.innerHTML = '❌ No se encontró portada automática.<br/><span style="font-size:.68rem">Usa la pestaña manual.</span>';
      return;
    }
    if (status) status.textContent = `✅ ${games.length} resultado(s) — toca la portada correcta:`;
    if (results) results.innerHTML = games.map(g =>
      `<div class="cover-opt" onclick="selectCover('${g.background_image.replace(/'/g, "\\'")}','${(g.name || '').replace(/'/g, "\\'")}')" title="${g.name || ''}">
        <img src="${g.background_image}" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block" loading="lazy" onerror="this.parentElement.style.display='none'"/>
        <div style="font-size:.58rem;padding:3px 4px;background:#111;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name || ''}</div>
      </div>`).join('');
  } catch (e) {
    if (status) status.innerHTML = '⚠️ Error de conexión. Usa la pestaña manual.';
  }
}
async function selectCover(url) {
  const status = document.getElementById('cover-status');
  if (status) status.textContent = '⬇️ Descargando imagen...';
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const b64 = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = e => r(e.target.result);
      fr.readAsDataURL(blob);
    });
    document.getElementById('ag-img-b64').value = b64;
    document.getElementById('cover-selected-img').src = b64;
    document.getElementById('cover-selected-wrap').style.display = 'block';
    if (status) status.innerHTML = '✅ Portada lista — si no es correcta elige otra o usa la pestaña manual.';
  } catch (e) {
    if (status) status.textContent = '⚠️ No se pudo descargar. Elige otra o súbela manualmente.';
  }
}
function clearCoverSelected() {
  document.getElementById('ag-img-b64').value = '';
  document.getElementById('cover-selected-wrap').style.display = 'none';
  document.getElementById('cover-selected-img').src = '';
  document.getElementById('cover-results').innerHTML = '';
  document.getElementById('cover-status').textContent = '';
}
function resetCoverTabs() {
  switchCoverTab('manual');
  clearCoverSelected();
  resetImgField('ag-img-file', 'ag-img-prev', 'ag-img-b64');
}

/* ────────────────────────────────────────────
   IMAGE UPLOAD HELPERS
──────────────────────────────────────────── */
function previewImg(input, prevId, b64Id) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(prevId);
    if (img) { img.src = e.target.result; img.style.display = 'block'; }
    const b64 = document.getElementById(b64Id);
    if (b64) b64.value = e.target.result;
    const txt = input.closest('.img-upload-field')?.querySelector('.img-upload-txt');
    if (txt) txt.style.display = 'none';
  };
  reader.readAsDataURL(file);
}
function resetImgField(fileId, prevId, b64Id) {
  const f = document.getElementById(fileId);
  const p = document.getElementById(prevId);
  const b = document.getElementById(b64Id);
  if (f) f.value = '';
  if (p) { p.style.display = 'none'; p.src = ''; }
  if (b) b.value = '';
  const txt = f?.closest('.img-upload-field')?.querySelector('.img-upload-txt');
  if (txt) txt.style.display = '';
}
function setImgField(b64, fileId, prevId, b64Id) {
  if (!b64) return;
  const p = document.getElementById(prevId);
  const b = document.getElementById(b64Id);
  if (p) { p.src = b64; p.style.display = 'block'; }
  if (b) b.value = b64;
  const f = document.getElementById(fileId);
  const txt = f?.closest('.img-upload-field')?.querySelector('.img-upload-txt');
  if (txt) txt.style.display = 'none';
}

/* ────────────────────────────────────────────
   ARTÍCULOS
──────────────────────────────────────────── */
function rACats() {
  const cats = ['Todos', ...new Set(ARTS.map(a => a.cat).filter(Boolean))];
  const el = document.getElementById('acattabs');
  if (el) el.innerHTML = cats.map(c =>
    `<div class="ctb ${c === aArtCat ? 'on' : ''}" onclick="setArtCat('${escAttr(c)}')">${c}</div>`).join('');
}
function setArtCat(c) { aArtCat = c; rACats(); rA(); }
function rA() {
  const q = document.getElementById('ainp')?.value.trim().toLowerCase() || '';
  let items = aArtCat === 'Todos' ? ARTS : ARTS.filter(a => a.cat === aArtCat);
  if (q) items = items.filter(a => a.name.toLowerCase().includes(q));
  const g = document.getElementById('agrid');
  if (!g) return;
  if (!items.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fas fa-tags"></i><p>${role === 'admin' ? 'Agrega el primer artículo.' : 'Sin artículos aún.'}</p></div>`;
    return;
  }
  g.innerHTML = items.map(a => `
    <div class="ac">
      <div class="ac-imgw">
        <div class="ac-actions">
          <button class="ca-btn cam" onclick="uploadArtImg(${a.id},event)" title="Imagen"><i class="fas fa-camera"></i></button>
          <button class="ca-btn edit" onclick="editArt(${a.id})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="ca-btn del" onclick="delArt(${a.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${a.img
          ? `<img src="${a.img}" alt="${escAttr(a.name)}" loading="lazy"/>`
          : `<div class="ac-ph"><i class="fas fa-image"></i><span>${a.name.substring(0, 14)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="aimg-${a.id}" onchange="saveArtImg(${a.id},this)"/>
      </div>
      <div class="ac-body">
        <div class="ac-name">${hl(a.name, q)}</div>
        <div class="ac-price">${a.price} Bs.</div>
        <div class="ac-cat">${a.cat || ''}</div>
      </div>
    </div>`).join('');
}
function uploadArtImg(id, e) { e.stopPropagation(); document.getElementById('aimg-' + id)?.click(); }
function saveArtImg(id, input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    const a = ARTS.find(x => x.id === id);
    if (a) { a.img = ev.target.result; save(); rA(); toast('Imagen guardada ✅', 's'); }
  };
  r.readAsDataURL(file);
}
function openArtModal(item = null) {
  document.getElementById('aa-tit').textContent = item ? 'Editar Artículo' : 'Agregar Artículo';
  document.getElementById('aa-eid').value = item ? item.id : '';
  document.getElementById('aa-n').value = item ? item.name : '';
  document.getElementById('aa-p').value = item ? item.price : '';
  document.getElementById('aa-c').value = item ? item.cat : '';
  item?.img ? setImgField(item.img, 'aa-img-file', 'aa-img-prev', 'aa-img-b64') : resetImgField('aa-img-file', 'aa-img-prev', 'aa-img-b64');
  oMod('m-aa');
}
function editArt(id) { const a = ARTS.find(x => x.id === id); if (a) openArtModal(a); }
function saveArt() {
  const eid = document.getElementById('aa-eid').value;
  const name = document.getElementById('aa-n').value.trim();
  const price = document.getElementById('aa-p').value.trim();
  const cat = document.getElementById('aa-c').value.trim();
  const img = document.getElementById('aa-img-b64').value;
  if (!name || !price) { toast('Nombre y precio requeridos', 'e'); return; }
  if (eid) {
    const a = ARTS.find(x => x.id === parseInt(eid));
    if (a) { a.name = name; a.price = price; a.cat = cat; if (img) a.img = img; }
  } else {
    ARTS.push({ id: Date.now(), name, price, cat, img: img || '' });
  }
  save(); cMod('m-aa'); resetImgField('aa-img-file', 'aa-img-prev', 'aa-img-b64');
  rACats(); rA(); toast(name + (eid ? ' actualizado' : ' agregado') + ' ✅', 's');
}
function delArt(id) {
  if (!confirm('¿Eliminar este artículo?')) return;
  ARTS = ARTS.filter(a => a.id !== id);
  save(); rA(); rACats(); toast('Eliminado', 's');
}

/* ────────────────────────────────────────────
   FÍSICOS
──────────────────────────────────────────── */
function rF() {
  const q = document.getElementById('finp')?.value.trim().toLowerCase() || '';
  let items = q ? FISI.filter(f => f.name.toLowerCase().includes(q)) : FISI;
  const g = document.getElementById('fgrid');
  if (!g) return;
  if (!items.length) {
    g.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fas fa-compact-disc"></i><p>${role === 'admin' ? 'Agrega el primer juego físico.' : 'Sin juegos físicos aún.'}</p></div>`;
    return;
  }
  g.innerHTML = items.map(f => `
    <div class="ac">
      <div class="ac-imgw">
        <div class="ac-actions">
          <button class="ca-btn cam" onclick="uploadFisImg(${f.id},event)" title="Imagen"><i class="fas fa-camera"></i></button>
          <button class="ca-btn edit" onclick="editFis(${f.id})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="ca-btn del" onclick="delFis(${f.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${f.img
          ? `<img src="${f.img}" alt="${escAttr(f.name)}" loading="lazy"/>`
          : `<div class="ac-ph"><i class="fas fa-compact-disc"></i><span>${f.name.substring(0, 14)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="fimg-${f.id}" onchange="saveFisImg(${f.id},this)"/>
      </div>
      <div class="ac-body">
        <div class="ac-name">${hl(f.name, q)}</div>
        <div class="ac-price" style="color:#10b981">${f.price} Bs.</div>
        <div class="ac-cat">PS4 Físico</div>
      </div>
    </div>`).join('');
}
function uploadFisImg(id, e) { e.stopPropagation(); document.getElementById('fimg-' + id)?.click(); }
function saveFisImg(id, input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = ev => {
    const f = FISI.find(x => x.id === id);
    if (f) { f.img = ev.target.result; save(); rF(); toast('Imagen guardada ✅', 's'); }
  };
  r.readAsDataURL(file);
}
function openFisModal(item = null) {
  document.getElementById('af-tit').textContent = item ? 'Editar Juego Físico' : 'Agregar Juego Físico';
  document.getElementById('af-eid').value = item ? item.id : '';
  document.getElementById('af-n').value = item ? item.name : '';
  document.getElementById('af-p').value = item ? item.price : '';
  item?.img ? setImgField(item.img, 'af-img-file', 'af-img-prev', 'af-img-b64') : resetImgField('af-img-file', 'af-img-prev', 'af-img-b64');
  oMod('m-af');
}
function editFis(id) { const f = FISI.find(x => x.id === id); if (f) openFisModal(f); }
function saveFis() {
  const eid = document.getElementById('af-eid').value;
  const name = document.getElementById('af-n').value.trim();
  const price = document.getElementById('af-p').value.trim();
  const img = document.getElementById('af-img-b64').value;
  if (!name || !price) { toast('Nombre y precio requeridos', 'e'); return; }
  if (eid) {
    const f = FISI.find(x => x.id === parseInt(eid));
    if (f) { f.name = name; f.price = price; if (img) f.img = img; }
  } else {
    FISI.push({ id: Date.now(), name, price, img: img || '' });
  }
  save(); cMod('m-af'); resetImgField('af-img-file', 'af-img-prev', 'af-img-b64');
  rF(); toast(name + (eid ? ' actualizado' : ' agregado') + ' ✅', 's');
}
function delFis(id) {
  if (!confirm('¿Eliminar este juego físico?')) return;
  FISI = FISI.filter(f => f.id !== id);
  save(); rF(); toast('Eliminado', 's');
}

/* ────────────────────────────────────────────
   REPARACIONES
──────────────────────────────────────────── */
function rRFil() {
  const cats = ['Todos', ...new Set(REPS.map(r => r.console))];
  const el = document.getElementById('rfilbtns');
  if (el) el.innerHTML = cats.map(c =>
    `<div class="ctb ${c === aRepCon ? 'on' : ''}" style="${c === aRepCon ? 'border-color:var(--dn);color:var(--dn);background:rgba(255,71,87,.07)' : ''}" onclick="setRepCon('${escAttr(c)}')">${c}</div>`).join('');
}
function setRepCon(c) { aRepCon = c; rRFil(); rR(); }
function rR() {
  const q = document.getElementById('rinp')?.value.trim().toLowerCase() || '';
  let items = aRepCon === 'Todos' ? REPS : REPS.filter(r => r.console === aRepCon);
  if (q) items = items.filter(r => r.name.toLowerCase().includes(q) || r.console.toLowerCase().includes(q));
  const g = document.getElementById('rgrid');
  if (!g) return;
  if (!items.length) { g.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fas fa-wrench"></i><p>Sin servicios.</p></div>`; return; }
  g.innerHTML = items.map(r => `
    <div class="rc">
      <div class="rc-acts">
        <button class="sbtn ed" onclick="editRep(${r.id})"><i class="fas fa-pen"></i></button>
        <button class="sbtn dl" onclick="delRep(${r.id})"><i class="fas fa-trash"></i></button>
      </div>
      <div class="rc-con">${r.console}</div>
      <div class="rc-name">${r.name}</div>
      <div class="rc-price">${r.price}</div>
      ${r.desc ? `<div class="rc-desc">${r.desc}</div>` : ''}
    </div>`).join('');
}
function openRepModal(item = null) {
  document.getElementById('ar-tit').textContent = item ? 'Editar Servicio' : 'Agregar Servicio';
  document.getElementById('ar-eid').value = item ? item.id : '';
  document.getElementById('ar-n').value = item ? item.name : '';
  document.getElementById('ar-c').value = item ? item.console : '';
  document.getElementById('ar-p').value = item ? item.price : '';
  document.getElementById('ar-d').value = item ? (item.desc || '') : '';
  oMod('m-ar');
}
function editRep(id) { const r = REPS.find(x => x.id === id); if (r) openRepModal(r); }
function saveRep() {
  const eid = document.getElementById('ar-eid').value;
  const name = document.getElementById('ar-n').value.trim();
  const con = document.getElementById('ar-c').value.trim();
  const price = document.getElementById('ar-p').value.trim();
  const desc = document.getElementById('ar-d').value.trim();
  if (!name || !con || !price) { toast('Nombre, consola y precio requeridos', 'e'); return; }
  if (eid) {
    const r = REPS.find(x => x.id === parseInt(eid));
    if (r) { r.name = name; r.console = con; r.price = price; r.desc = desc; }
  } else {
    REPS.push({ id: Date.now(), name, console: con, price, desc });
  }
  save(); cMod('m-ar'); rRFil(); rR(); toast(name + (eid ? ' actualizado' : ' agregado') + ' ✅', 's');
}
function delRep(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  REPS = REPS.filter(r => r.id !== id);
  save(); rRFil(); rR(); toast('Eliminado', 's');
}

/* ────────────────────────────────────────────
   FLASHEO / GUÍAS
──────────────────────────────────────────── */
function rFlash() {
  const grid = document.getElementById('flasgrid');
  if (!grid) return;
  if (!GUIDES.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><i class="fas fa-book-open"></i><p>Sin guías aún.</p></div>`;
    return;
  }
  grid.innerHTML = GUIDES.map(g => `
    <div class="fc" onclick="openGuide(${g.id})">
      ${role === 'admin' ? `<div class="rc-acts" style="display:flex;top:10px;right:10px">
        <button class="sbtn ed" onclick="editGuide(${g.id},event)"><i class="fas fa-pen"></i></button>
        <button class="sbtn dl" onclick="delGuide(${g.id},event)"><i class="fas fa-trash"></i></button>
      </div>` : ''}
      <div class="fc-ic"><i class="fas fa-book-open"></i></div>
      <div class="fc-con">${g.console}</div>
      <div class="fc-tit">${g.title}</div>
      <div class="fc-dsc">${g.desc}</div>
    </div>`).join('');
}
function openGuide(id) {
  const g = GUIDES.find(x => x.id === id); if (!g) return;
  document.getElementById('fl-tit').textContent = g.title;
  document.getElementById('fl-sub').textContent = g.desc + ' · ' + g.console;
  document.getElementById('fl-steps').innerHTML = g.steps.map((s, n) =>
    `<div class="si"><span class="sn">${n + 1}</span><span class="st">${s}</span></div>`).join('');
  oMod('m-fl');
}
function openAddGuide() {
  editGuideId = null;
  document.getElementById('ga-tit').textContent = 'Agregar Guía';
  document.getElementById('ga-ico').className = 'fas fa-plus';
  document.getElementById('ga-con').value = 'PS4';
  document.getElementById('ga-title').value = '';
  document.getElementById('ga-desc').value = '';
  document.getElementById('ga-steps').value = '';
  oMod('m-ga');
  setTimeout(() => document.getElementById('ga-title')?.focus(), 100);
}
function editGuide(id, e) {
  if (e) e.stopPropagation();
  const g = GUIDES.find(x => x.id === id); if (!g) return;
  editGuideId = id;
  document.getElementById('ga-tit').textContent = 'Editar Guía';
  document.getElementById('ga-ico').className = 'fas fa-pen';
  document.getElementById('ga-con').value = g.console;
  document.getElementById('ga-title').value = g.title;
  document.getElementById('ga-desc').value = g.desc;
  document.getElementById('ga-steps').value = g.steps.join('\n');
  oMod('m-ga');
}
function saveGuide() {
  const con = document.getElementById('ga-con').value;
  const title = document.getElementById('ga-title').value.trim();
  const desc = document.getElementById('ga-desc').value.trim();
  const stepsRaw = document.getElementById('ga-steps').value.trim();
  if (!title || !stepsRaw) { toast('Título y pasos son obligatorios', 'e'); return; }
  const steps = stepsRaw.split('\n').map(s => s.trim()).filter(Boolean);
  if (editGuideId) {
    const g = GUIDES.find(x => x.id === editGuideId);
    if (g) { g.console = con; g.title = title; g.desc = desc; g.steps = steps; }
  } else {
    GUIDES.push({ id: Date.now(), console: con, title, desc, steps });
  }
  save(); cMod('m-ga'); rFlash();
  toast(title + (editGuideId ? ' actualizada' : ' agregada') + ' ✅', 's');
  editGuideId = null;
}
function delGuide(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('¿Eliminar esta guía?')) return;
  GUIDES = GUIDES.filter(g => g.id !== id);
  save(); rFlash(); toast('Guía eliminada', 's');
}

/* ────────────────────────────────────────────
   INGRESOS
──────────────────────────────────────────── */
function rIngresos() {
  const filterVal = document.getElementById('ing-filter')?.value || 'all';
  let items = INGRESOS.slice().reverse();
  if (filterVal !== 'all') {
    items = items.filter(i => {
      const d = new Date(i.fecha); const now = new Date();
      if (filterVal === 'week') { const w = new Date(); w.setDate(w.getDate() - 7); return d >= w; }
      if (filterVal === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filterVal === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  }
  const total = items.reduce((s, i) => s + Number(i.monto), 0);
  const hoy = new Date().toDateString();
  const hoyTotal = items.filter(i => new Date(i.fecha).toDateString() === hoy).reduce((s, i) => s + Number(i.monto), 0);
  const count = items.length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ing-total', total.toLocaleString('es') + ' Bs.');
  set('ing-hoy', hoyTotal.toLocaleString('es') + ' Bs.');
  set('ing-count', count + ' registro' + (count !== 1 ? 's' : ''));
  const list = document.getElementById('ing-list');
  if (!list) return;
  list.innerHTML = items.length
    ? items.map(i => `
      <div class="ing-card">
        <div class="ing-card-icon"><i class="fas fa-coins"></i></div>
        <div class="ing-card-info">
          <div class="ing-card-trabajo">${i.trabajo}</div>
          <div class="ing-card-fecha"><i class="fas fa-clock" style="font-size:.6rem"></i> ${fmtFecha(i.fecha)}</div>
        </div>
        <div class="ing-card-monto">+${Number(i.monto).toLocaleString('es')} Bs.</div>
        <div class="ing-card-acts">
          <button class="sbtn dl" onclick="delIngreso(${i.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>`).join('')
    : `<div class="ing-empty"><i class="fas fa-coins"></i><p style="font-size:.86rem;color:var(--mu)">Sin ingresos registrados aún.</p></div>`;
}
function addIngreso() {
  const trabajo = document.getElementById('ing-trabajo').value.trim();
  const monto = parseFloat(document.getElementById('ing-monto').value);
  if (!trabajo || !monto || monto <= 0) { toast('Completa trabajo realizado y monto', 'e'); return; }
  INGRESOS.push({ id: Date.now(), trabajo, monto, fecha: new Date().toISOString() });
  fbSave('ingresos', { items: INGRESOS });
  document.getElementById('ing-trabajo').value = '';
  document.getElementById('ing-monto').value = '';
  rIngresos(); toast('Ingreso registrado ✅', 's');
}
function delIngreso(id) {
  if (!confirm('¿Eliminar este ingreso?')) return;
  INGRESOS = INGRESOS.filter(i => i.id !== id);
  fbSave('ingresos', { items: INGRESOS });
  rIngresos(); toast('Eliminado', 's');
}
function printIngresos() { window.print(); }
function limpiarIngresos() {
  if (!INGRESOS.length) { toast('No hay ingresos que limpiar', 'e'); return; }
  if (!confirm('¿Eliminar TODOS los registros de ingresos? Esta acción no se puede deshacer.')) return;
  INGRESOS = [];
  fbSave('ingresos', { items: INGRESOS });
  rIngresos(); toast('Historial limpiado', 's');
}

/* ────────────────────────────────────────────
   ADMIN USERS
──────────────────────────────────────────── */
function addUser() {
  const u = document.getElementById('nu-u').value.trim().toLowerCase();
  const p = document.getElementById('nu-p').value;
  const d = document.getElementById('nu-d').value.trim();
  const err = document.getElementById('nu-err');
  if (!u || !p || !d) { err.textContent = 'Todos los campos requeridos.'; err.classList.add('on'); return; }
  if (ADMINS.find(a => a.user === u)) { err.textContent = 'Usuario ya existe.'; err.classList.add('on'); return; }
  ADMINS.push({ user: u, pass: sh(p), display: d });
  fbSave('admins', { items: ADMINS });
  cMod('m-au');
  ['nu-u', 'nu-p', 'nu-d'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  err.classList.remove('on'); rUsers(); toast('Admin "' + d + '" creado ✅', 's');
}
function delUser(i) {
  if (i === 0) { toast('No puedes eliminar el admin principal', 'e'); return; }
  if (!confirm('¿Eliminar a "' + ADMINS[i].display + '"?')) return;
  ADMINS.splice(i, 1);
  fbSave('admins', { items: ADMINS });
  rUsers(); toast('Admin eliminado', 's');
}
function rUsers() {
  const el = document.getElementById('ulist');
  if (!el) return;
  el.innerHTML = ADMINS.map((a, i) => `
    <div class="urow">
      <div class="uav"><i class="fas fa-crown"></i></div>
      <div class="ui"><div class="un">${a.display}</div><div class="ur">@${a.user} · Administrador</div></div>
      ${i === 0
        ? '<span style="font-size:.68rem;color:var(--mu)">Principal</span>'
        : `<button class="sbtn dl" onclick="delUser(${i})"><i class="fas fa-trash"></i> Eliminar</button>`}
    </div>`).join('');
}

/* ────────────────────────────────────────────
   WORKLIST
──────────────────────────────────────────── */
let WORKLIST = JSON.parse(localStorage.getItem('eg_worklist') || '[]');
function saveWorklist() { localStorage.setItem('eg_worklist', JSON.stringify(WORKLIST)); }
function openWorklist() {
  renderWorklist(); oMod('m-worklist');
  setTimeout(() => document.getElementById('wl-input')?.focus(), 100);
}
function addWorklistItem() {
  const inp = document.getElementById('wl-input');
  const raw = inp?.value.trim();
  if (!raw) { toast('Escribe o pega los juegos', 'e'); return; }
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let added = 0;
  lines.forEach(line => {
    const clean = cleanWorklistLine(line);
    if (!clean) return;
    if (WORKLIST.some(w => w.name.toLowerCase() === clean.toLowerCase())) return;
    WORKLIST.push({ id: Date.now() + Math.random() + added, name: clean, done: false });
    added++;
  });
  if (!added) { toast('No se reconoció ningún juego nuevo', 'e'); return; }
  saveWorklist();
  if (inp) inp.value = '';
  renderWorklist(); updateWorklistBadge();
  toast(added === 1 ? '1 juego agregado ✅' : added + ' juegos agregados ✅', 's');
}
function cleanWorklistLine(line) {
  let t = line.trim();
  if (!t) return null;
  if (/^\*?(PS\d|PSVita|PSP|Switch|Wii|Xbox\d*)\*?:?\*?\s*$/i.test(t)) return null;
  if (/^total\s*:?\s*\d+/i.test(t)) return null;
  if (/lista de juegos|evolution games/i.test(t)) return null;
  t = t.replace(/^\d+\s*[.\)\-]\s*/, '');
  t = t.replace(/^[-•*]\s*/, '');
  t = t.replace(/^[^\p{L}\p{N}]+/u, '');
  t = t.replace(/^\*+|\*+$/g, '').trim();
  t = t.replace(/:\s*$/, '').trim();
  return t || null;
}
function toggleWorklistItem(id) {
  const item = WORKLIST.find(w => w.id === id);
  if (item) { item.done = !item.done; saveWorklist(); renderWorklist(); updateWorklistBadge(); }
}
function delWorklistItem(id) {
  WORKLIST = WORKLIST.filter(w => w.id !== id);
  saveWorklist(); renderWorklist(); updateWorklistBadge();
}
function clearWorklist(onlyDone) {
  if (onlyDone) {
    if (!WORKLIST.some(w => w.done)) { toast('No hay juegos marcados como listos', 'e'); return; }
    if (!confirm('¿Quitar todos los juegos marcados como listos?')) return;
    WORKLIST = WORKLIST.filter(w => !w.done);
  } else {
    if (!WORKLIST.length) { toast('La lista ya está vacía', 'e'); return; }
    if (!confirm('¿Borrar toda la lista de trabajo?')) return;
    WORKLIST = [];
  }
  saveWorklist(); renderWorklist(); updateWorklistBadge(); toast('Lista actualizada', 's');
}
function renderWorklist() {
  const wrap = document.getElementById('wl-list');
  if (!wrap) return;
  if (!WORKLIST.length) {
    wrap.innerHTML = `<div class="cart-empty"><i class="fas fa-clipboard-list"></i><p style="font-size:.84rem">Aún no anotaste juegos.<br/>Escribe arriba y presiona Enter o el botón +.</p></div>`;
    return;
  }
  wrap.innerHTML = WORKLIST.map(item => `
    <div class="wl-item ${item.done ? 'done' : ''}">
      <button type="button" class="wl-check" onclick="toggleWorklistItem(${item.id})" title="${item.done ? 'Marcar pendiente' : 'Marcar listo'}">
        <i class="fas fa-${item.done ? 'check' : ''}"></i>
      </button>
      <span class="wl-name">${item.name}</span>
      <button type="button" class="cart-item-rm" onclick="delWorklistItem(${item.id})"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}
function updateWorklistBadge() {
  const b = document.getElementById('worklist-badge');
  if (!b) return;
  const pending = WORKLIST.filter(w => !w.done).length;
  b.textContent = pending;
  b.style.display = WORKLIST.length ? 'flex' : 'none';
}

/* ────────────────────────────────────────────
   CART (catálogo de clientes)
──────────────────────────────────────────── */
let CART = JSON.parse(localStorage.getItem('eg_cart') || '[]');
function saveCart() { localStorage.setItem('eg_cart', JSON.stringify(CART)); }
function isInCart(con, name) { return CART.some(c => c.con === con && c.name === name); }
function toggleCart(con, name, btn) {
  const idx = CART.findIndex(c => c.con === con && c.name === name);
  if (idx >= 0) {
    CART.splice(idx, 1);
    if (btn) { btn.classList.remove('added'); btn.innerHTML = '<i class="fas fa-plus"></i>'; }
  } else {
    CART.push({ con, name });
    if (btn) { btn.classList.add('added'); btn.innerHTML = '<i class="fas fa-check"></i>'; }
  }
  saveCart(); updateCartBadge();
}
function updateCartBadge() {
  const b = document.getElementById('cart-badge');
  if (b) b.textContent = CART.length;
}
function openCart() {
  const list = document.getElementById('cart-list');
  if (!list) return;
  if (!CART.length) {
    list.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p style="font-size:.84rem">Tu lista está vacía.<br/>Agrega juegos desde el catálogo.</p></div>`;
  } else {
    list.innerHTML = CART.map((c, i) => `
      <div class="cart-item">
        <div style="flex:1">
          <div class="cart-item-name">${c.name}</div>
          <div class="cart-item-con">${c.con}</div>
        </div>
        <button class="cart-item-rm" onclick="removeFromCart(${i})"><i class="fas fa-trash"></i></button>
      </div>`).join('');
  }
  oMod('m-cart');
}
function removeFromCart(i) {
  CART.splice(i, 1); saveCart(); updateCartBadge(); openCart();
}
function clearCart() {
  if (!CART.length) return;
  if (!confirm('¿Vaciar toda la lista?')) return;
  CART = []; saveCart(); updateCartBadge(); openCart();
}
function sendCartToWhatsApp(target = 'principal') {
  if (!CART.length) { toast('Tu lista está vacía', 'e'); return; }
  const byCon = {};
  CART.forEach(c => { (byCon[c.con] = byCon[c.con] || []).push(c.name); });
  let msg = '';
  Object.entries(byCon).forEach(([con, games]) => {
    msg += `*${con}:*\n`;
    games.forEach((g, i) => { msg += `${i + 1}. ${g}\n`; });
    msg += '\n';
  });
  msg += `Total: ${CART.length} juego(s)`;
  const number = WHATSAPP_NUMBERS[target] || WHATSAPP_NUMBERS.principal;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ────────────────────────────────────────────
   CATÁLOGO DE CLIENTES
──────────────────────────────────────────── */
function renderClientConsoles() {
  const grid = document.getElementById('client-console-grid');
  if (!grid) return;
  grid.innerHTML = orderedConsoles().map(c => {
    const n = Object.values(window.GDB[c] || {}).flat().length;
    const disabled = n === 0;
    return `<a href="cliente-catalogo.html?con=${c}" class="ccon-card ${disabled ? 'disabled' : ''}" ${disabled ? 'onclick="return false"' : ''}>
      <i class="${cIco(c)}"></i>
      <div class="ccon-name">${c}</div>
      <div class="ccon-count">${n ? n + ' juegos' : 'Próximamente'}</div>
    </a>`;
  }).join('');
}

function renderClientGenreTabs(all) {
  const wrap = document.getElementById('client-genre-tabs');
  if (!wrap) return;
  if (!all.length) { wrap.innerHTML = ''; wrap.style.display = 'none'; return; }
  const present = new Set(all.map(g => getGenre(g.name)));
  const tabs = ['Todos', ...GENRE_LIST.filter(g => present.has(g))];
  wrap.style.display = 'flex';
  wrap.innerHTML = tabs.map(g =>
    `<div class="ctb ${activeClientGenre === g ? 'on' : ''}" onclick="setClientGenre('${escAttr(g)}')">${g}</div>`).join('');
}
function setClientGenre(g) { activeClientGenre = g; renderClientGames(); }

function renderClientGames() {
  const grid = document.getElementById('client-ggrid');
  if (!grid) return;
  const params = new URLSearchParams(window.location.search);
  const con = params.get('con') || 'PS4';
  const titleEl = document.getElementById('client-con-title');
  if (titleEl) titleEl.textContent = con;
  const q = document.getElementById('sinp')?.value.trim().toLowerCase() || '';
  const discos = window.GDB[con] || {};
  let all = [];
  const seen = new Set();
  Object.entries(discos).forEach(([disk, gs]) => gs.forEach(g => {
    if (seen.has(g)) return;
    seen.add(g);
    all.push({ name: g, disk });
  }));
  all.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  renderClientGenreTabs(all);
  if (activeClientGenre !== 'Todos') all = all.filter(g => getGenre(g.name) === activeClientGenre);
  const fil = q ? all.filter(g => g.name.toLowerCase().includes(q)) : all;
  if (!fil.length && !q) {
    grid.innerHTML = `<div class="empty"><i class="fas fa-compact-disc"></i><p>Catálogo de <strong>${con}</strong> próximamente.</p></div>`;
    return;
  }
  if (!fil.length) {
    grid.innerHTML = `<div class="empty"><i class="fas fa-search"></i><p>No se encontró "<strong>${q}</strong>".</p></div>`;
    return;
  }
  grid.innerHTML = fil.map(g => {
    const img = GIMGS[con + '::' + g.name] || '';
    const inCart = isInCart(con, g.name);
    const nameAttr = escAttr(g.name);
    return `<div class="gc client-gc">
      <div class="gc-imgw">
        ${img
          ? `<img src="${img}" alt="${nameAttr}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block"/>`
          : `<div class="gc-ph"><i class="fas fa-compact-disc"></i><span style="font-size:.6rem">${g.name.substring(0, 18)}</span></div>`}
        <button type="button" class="gc-add ${inCart ? 'added' : ''}" data-act="toggle-cart" data-con="${con}" data-name="${nameAttr}">
          <i class="fas fa-${inCart ? 'check' : 'plus'}"></i>
        </button>
      </div>
      <div class="gc-body">
        <div class="gc-name">${hl(g.name, q)}</div>
      </div>
    </div>`;
  }).join('');
}

/* Event delegation para client catalog */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('client-ggrid');
  if (!grid) return;
  grid.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act="toggle-cart"]');
    if (!el) return;
    toggleCart(el.dataset.con, el.dataset.name, el);
  });
});

/* ────────────────────────────────────────────
   IMPRIMIR
──────────────────────────────────────────── */
function iPrint() {
  const conTabs = document.getElementById('print-con-tabs');
  if (!conTabs) return;
  conTabs.innerHTML = orderedConsoles().map(c =>
    `<div class="ctab ${c === pCon ? 'on' : ''}" onclick="setPCon('${c}')">${c}</div>`).join('');
  renderPrintOptions();
}
function setPCon(c) { pCon = c; iPrint(); }
function setPOpt(o) { pOpt = o; renderPrintOptions(); }
function renderPrintOptions() {
  const wrap = document.getElementById('print-options');
  if (!wrap) return;
  const discos = window.GDB[pCon] || {};
  const optBtns = document.getElementById('print-opt-btns');
  if (optBtns) optBtns.innerHTML = [
    { v: 'all', l: 'Todos los discos' },
    ...Object.keys(discos).map(d => ({ v: d, l: d }))
  ].map(o => `<div class="ctb ${pOpt === o.v ? 'on' : ''}" onclick="setPOpt('${escAttr(o.v)}')">${o.l}</div>`).join('');
  let games = [];
  if (pOpt === 'all') {
    Object.entries(discos).forEach(([disk, gs]) => gs.forEach(g => games.push({ name: g, disk })));
  } else {
    (discos[pOpt] || []).forEach(g => games.push({ name: g, disk: pOpt }));
  }
  games.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const grid = document.getElementById('print-grid');
  if (!grid) return;
  if (!games.length) { grid.innerHTML = `<div class="empty"><i class="fas fa-compact-disc"></i><p>Sin juegos.</p></div>`; return; }
  grid.innerHTML = games.map(g => {
    const img = GIMGS[pCon + '::' + g.name] || '';
    return `<div class="print-card">
      <div class="print-card-img">${img ? `<img src="${img}" loading="lazy"/>` : `<i class="fas fa-compact-disc" style="font-size:2rem;color:var(--mu)"></i>`}</div>
      <div class="print-card-name">${g.name}</div>
      <div class="print-card-disk">${g.disk}</div>
    </div>`;
  }).join('');
}
function resetPrintedList() {
  if (!confirm('¿Resetear la lista de impresión?')) return;
  toast('Lista reseteada', 's');
}
function doPrint() { window.print(); }

/* ────────────────────────────────────────────
   PARTÍCULAS (fondo animado)
──────────────────────────────────────────── */
(function () {
  const c = document.getElementById('pts');
  if (!c) return;
  const ctx = c.getContext('2d');
  let W, H, p = [];
  function r() { W = c.width = innerWidth; H = c.height = innerHeight; }
  window.addEventListener('resize', r); r();
  class P {
    constructor() { this.rs(); }
    rs() { this.x = Math.random() * W; this.y = Math.random() * H; this.radius = Math.random() * 1.3 + .3; this.vx = (Math.random() - .5) * .23; this.vy = (Math.random() - .5) * .23; this.alpha = Math.random() * .38 + .1; }
    up() { this.x += this.vx; this.y += this.vy; if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.rs(); }
    dr() { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,212,255,${this.alpha})`; ctx.fill(); }
  }
  for (let i = 0; i < 60; i++) p.push(new P());
  function loop() {
    ctx.clearRect(0, 0, W, H);
    p.forEach(x => { x.up(); x.dr(); });
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      const dx = p[i].x - p[j].x, dy = p[i].y - p[j].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 105) { ctx.beginPath(); ctx.moveTo(p[i].x, p[i].y); ctx.lineTo(p[j].x, p[j].y); ctx.strokeStyle = `rgba(0,212,255,${.09 * (1 - d / 105)})`; ctx.lineWidth = .55; ctx.stroke(); }
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

/* ────────────────────────────────────────────
   DOMContentLoaded — INIT + EVENT LISTENERS
──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Dark mode
  initDarkMode();

  // Cerrar modales al click en overlay
  document.querySelectorAll('.ov').forEach(o => o.addEventListener('click', function (e) {
    if (e.target === this) cMod(this.id);
  }));

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', doLogout);

  // Dark mode toggle
  document.querySelectorAll('.dark-toggle').forEach(btn => btn.addEventListener('click', toggleDark));

  // Búsqueda global
  const globalSearch = document.getElementById('global-search');
  if (globalSearch) globalSearch.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (document.getElementById('ggrid')) { document.getElementById('sinp').value = q; rG(); }
    if (document.getElementById('client-ggrid')) { document.getElementById('sinp').value = q; renderClientGames(); }
  });

  // Enter en login
  document.getElementById('lp')?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('ag-n')?.addEventListener('keydown', e => { if (e.key === 'Enter') saveGame(); });

  // Inicializar datos desde Firebase
  await init();
});

/* ────────────────────────────────────────────
   GLOBALS — exponemos todo para el HTML inline
──────────────────────────────────────────── */
Object.assign(window, {
  oMod, cMod, doLogin, toggleDark,
  // Catálogo
  iCat, setCon, setDisk, rG,
  openAddGame, editGame, saveGame, delGame,
  openDiskModal, moveDiskGame,
  uploadGameImg, saveGameImg,
  openManageDisks, addDisk, deleteDisk,
  onAgDiskChange, onAgConsoleChange,
  refreshDiskOptions,
  // Portadas
  switchCoverTab, buscarPortadaAuto, selectCover, clearCoverSelected, resetCoverTabs,
  // Imágenes
  previewImg, resetImgField,
  // Artículos
  rA, rACats, setArtCat, openArtModal, saveArt, editArt, delArt,
  uploadArtImg, saveArtImg,
  // Físicos
  rF, openFisModal, saveFis, editFis, delFis,
  uploadFisImg, saveFisImg,
  // Reparaciones
  rR, rRFil, setRepCon, openRepModal, saveRep, editRep, delRep,
  // Guías
  rFlash, openGuide, openAddGuide, editGuide, saveGuide, delGuide,
  // Ingresos
  rIngresos, addIngreso, delIngreso, printIngresos, limpiarIngresos,
  // Users
  rUsers, addUser, delUser,
  // Worklist
  openWorklist, addWorklistItem, clearWorklist, toggleWorklistItem, delWorklistItem, updateWorklistBadge,
  // Cart
  openCart, removeFromCart, clearCart, sendCartToWhatsApp, updateCartBadge,
  // Client catalog
  renderClientConsoles, renderClientGames, setClientGenre,
  // Print
  iPrint, setPCon, setPOpt, doPrint, resetPrintedList,
  // Dashboard
  renderDashboard,
  // Toast
  toast,
});
