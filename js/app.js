// ═══════════════════════════════════════════════
//  EVOLUCIÓN GAMES B&R — Lógica principal
// ═══════════════════════════════════════════════
import { cargarGDB, guardarGDB, escucharGDB } from './firebase.js';

/* ── HASH ── */
function sh(s){let h=0;for(let i=0;i<s.length;i++)h=Math.imul(31,h)+s.charCodeAt(i)|0;return h.toString(16)}

/* ── HTML attribute escaping (evita romper onclick con nombres como "Assassin's Creed") ── */
function escAttr(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

/* ── STATE ── */
// GDB viene de data/games.js (base original). Si hay una versión guardada
// en localStorage (porque el admin agregó/editó/eliminó juegos), esa tiene prioridad.
(function loadGDB(){
  const stored = localStorage.getItem('eg_gdb');
  if(stored){
    try{
      const parsed = JSON.parse(stored);
      // Asegura que existan todas las consolas definidas en games.js aunque
      // no estén en lo guardado (por si se agregó una consola nueva al archivo).
      Object.keys(GDB).forEach(con=>{ if(!parsed[con]) parsed[con]=GDB[con]; });
      GDB = parsed;
    }catch(e){ console.warn('No se pudo cargar eg_gdb, usando datos base.'); }
  }
})();
function saveGDB(){ localStorage.setItem('eg_gdb', JSON.stringify(GDB)); }

// GENRES viene de data/games.js. Si el admin reclasifica un juego,
// se guarda en localStorage y tiene prioridad.
(function loadGenres(){
  const stored = localStorage.getItem('eg_genres');
  if(stored){
    try{
      const parsed = JSON.parse(stored);
      GENRES = Object.assign({}, GENRES, parsed);
    }catch(e){ console.warn('No se pudo cargar eg_genres.'); }
  }
})();
const GENRE_LIST = ['Aventura','Acción','Terror','Deportes','Multijugador','RPG'];
function getGenre(name){ return GENRES[name] || 'Sin clasificar'; }
function setGenre(name, genre){
  GENRES[name]=genre;
  localStorage.setItem('eg_genres', JSON.stringify(GENRES));
}

let GIMGS   = JSON.parse(localStorage.getItem('eg_gimgs')||'{}');
let ARTS    = JSON.parse(localStorage.getItem('eg_arts') ||'[]');
let FISI    = JSON.parse(localStorage.getItem('eg_fis')  ||'[]');
let REPS    = JSON.parse(localStorage.getItem('eg_reps') ||JSON.stringify([
  {id:1,name:'Flasheo PS4 Fat/Slim/Pro',console:'PS4',price:'Desde 80 Bs.',desc:'Versiones 9.00 en adelante. Incluye revisión previa.'},
  {id:2,name:'Flasheo PS5',console:'PS5',price:'Consultar',desc:'Consulta tu versión antes.'},
  {id:3,name:'Chipeado Nintendo Switch',console:'Switch',price:'Desde 120 Bs.',desc:'Modchip Picofly o RCM según modelo.'},
  {id:4,name:'Mantenimiento PS4',console:'PS4',price:'50 Bs.',desc:'Limpieza, pasta térmica y revisión.'},
  {id:5,name:'Mantenimiento PS5',console:'PS5',price:'70 Bs.',desc:'Limpieza completa y enfriamiento.'},
  {id:6,name:'Reparación HDMI PS4/PS5',console:'PS4/PS5',price:'Desde 60 Bs.',desc:'Cambio de puerto HDMI dañado.'},
  {id:7,name:'Carga de juegos PS4',console:'PS4',price:'15 Bs. x juego',desc:'Instalación en disco duro.'},
  {id:8,name:'Carga de juegos PS3',console:'PS3',price:'10 Bs. x juego',desc:'PKG o backup.'},
]));
let INGRESOS = JSON.parse(localStorage.getItem('eg_ing') ||'[]');
let ADMINS   = JSON.parse(localStorage.getItem('eg_admins')||'null') || [{user:'admin',pass:sh('admin123'),display:'Administrador Principal'}];

const DEFAULT_GUIDES = [
  {id:1,console:'PS4',title:'Flasheo PS4 — v9.00 a 11.00',desc:'HEN vía exploit web',steps:['Verifica que el PS4 esté en versión 9.00, 9.03, 9.04 o 11.00.','Ve a Configuración → Red → Configurar conexión a Internet.','Elige Wi-Fi o LAN, método Personalizado.','DNS Primario: 165.227.83.145 · DNS Secundario: 8.8.8.8.','Continúa hasta el final y prueba la conexión.','Abre el navegador del PS4 y accede al sitio del exploit.','Sigue las instrucciones en pantalla.','Con el HEN activo ya puedes cargar juegos backup.']},
  {id:2,console:'PS4',title:'Flasheo PS4 — v11.02 a 13.00',desc:'Vía USB/disco instalador',steps:['Necesitas un USB formateado en FAT32.','Copia el archivo PKG del exploit al USB.','Inserta el USB en el PS4.','Ve a Ajustes → Dispositivos de almacenamiento USB.','Instala el PKG desde el explorador.','Sigue los pasos del instalador.','Reinicia el PS4 cuando se indique.','El exploit quedará activo.']},
  {id:3,console:'PS3',title:'Flasheo PS3 — CFW/HFW',desc:'Multiman vía internet o USB',steps:['Verifica compatibilidad (Fat/Slim hasta v4.82).','Descarga el HFW para tu versión.','Instálalo desde Ajustes → Sistema → Actualización.','Instala PS3HEN desde el navegador del PS3.','Activa HEN cada vez que enciendas la consola.','Instala Multiman PKG para gestionar backups.','Los juegos van en ISO o carpeta GAMEZ en el HDD.']},
  {id:4,console:'Switch',title:'Chipeado Nintendo Switch — Picofly',desc:'Modchip para cualquier versión',steps:['Requiere apertura física de la consola.','Se instala el modchip Picofly en la placa.','Compatible con todas las versiones incluidas las parchadas.','Arranca automáticamente con CFW Atmosphere.','Los juegos van en microSD en formato NSP o XCI.','No requiere pasos manuales al encender.']},
  {id:5,console:'Switch',title:'Nintendo Switch — Modo RCM',desc:'Solo modelos no parchados',steps:['Solo para Switch sin parche (pre-2018 aprox).','Apaga completamente la Switch.','Inserta el jig RCM en los pines del Joy-Con derecho.','Mantén Vol+ y presiona Power para entrar en RCM.','Conecta al PC y usa TegraRcmGUI para inyectar payload.','Arranca Atmosphere automáticamente.','Los juegos van en la microSD.']},
];
let GUIDES = JSON.parse(localStorage.getItem('eg_guides')||'null') || JSON.parse(JSON.stringify(DEFAULT_GUIDES));

let role = sessionStorage.getItem('eg_role') || 'guest';
let aCon='PS4', aArtCat='Todos', aRepCon='Todos', pCon='PS4', pOpt='all';
let currentDiskModal = null;

function save(){
  localStorage.setItem('eg_gdb',     JSON.stringify(GDB));
  localStorage.setItem('eg_gimgs',   JSON.stringify(GIMGS));
  localStorage.setItem('eg_arts',    JSON.stringify(ARTS));
  localStorage.setItem('eg_fis',     JSON.stringify(FISI));
  localStorage.setItem('eg_reps',    JSON.stringify(REPS));
  localStorage.setItem('eg_ing',     JSON.stringify(INGRESOS));
  localStorage.setItem('eg_admins',  JSON.stringify(ADMINS));
  localStorage.setItem('eg_guides',  JSON.stringify(GUIDES));
  localStorage.setItem('eg_genres',  JSON.stringify(GENRES));
  // ── Firebase: sube catálogo a la nube para que todos lo vean ──
  guardarGDB();
}

/* ══════════════════════════════
   NAVIGATION
══════════════════════════════ */
function goTo(p){
  if(p==='adminusers'&&role!=='admin') return;
  if(p==='ingresos'&&role!=='admin'){toast('Solo el admin puede ver ingresos','e');return;}
  if(p==='imprimir'&&role!=='admin'){toast('Solo el admin puede imprimir','e');return;}
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
  document.getElementById('page-'+p)?.classList.add('active');
  window.scrollTo(0,0);
  const init = {
    catalogo: iCat,
    articulos: ()=>{rACats();rA();},
    fisicos:   rF,
    reparaciones: ()=>{rRFil();rR();},
    flasheo:   rFlash,
    adminusers:rUsers,
    ingresos:  rIngresos,
    imprimir:  iPrint,
  };
  init[p]?.();
}

/* ══════════════════════════════
   MODAL HELPERS
══════════════════════════════ */
function oMod(id){document.getElementById(id)?.classList.add('op');}
function cMod(id){document.getElementById(id)?.classList.remove('op');}
window.oMod = oMod;
window.cMod = cMod;
document.addEventListener('DOMContentLoaded', async ()=>{
  document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',function(e){if(e.target===this)this.classList.remove('op');}));
  // ── Carga catálogo desde Firebase ──
  await cargarGDB();
  // Escucha cambios en tiempo real → todos ven lo mismo al instante
  escucharGDB(()=>{
    if(document.getElementById('ctabs'))   iCat();
    if(document.getElementById('client-console-grid')) renderClientConsoles();
    if(document.getElementById('client-ggrid'))        renderClientGames();
  });
});

/* ══════════════════════════════
   PORTADAS AUTOMÁTICAS
   Pestaña "Buscar automático" en el modal de agregar/editar juego.
   Usa RAWG.io (API pública). Si no encuentra o la imagen
   no es correcta el admin elige otra o sube la suya.
══════════════════════════════ */
function switchCoverTab(tab){
  const isManual=tab==='manual';
  document.getElementById('cover-manual').style.display=isManual?'block':'none';
  document.getElementById('cover-auto').style.display=isManual?'none':'block';
  document.getElementById('tab-manual').classList.toggle('on',isManual);
  document.getElementById('tab-auto').classList.toggle('on',!isManual);
  if(!isManual){
    const q=document.getElementById('ag-n').value.trim();
    if(q) buscarPortadaAuto();
  }
}
window.switchCoverTab = switchCoverTab;
async function buscarPortadaAuto(){
  const name=document.getElementById('ag-n').value.trim();
  if(!name){toast('Escribe el nombre del juego primero','e');return;}
  const status=document.getElementById('cover-status');
  const results=document.getElementById('cover-results');
  status.textContent='🔍 Buscando portada...';
  results.innerHTML='';
  try{
    const res=await fetch(`https://api.rawg.io/api/games?search=${encodeURIComponent(name)}&page_size=6&key=`);
    const data=await res.json();
    const games=(data.results||[]).filter(g=>g.background_image);
    if(!games.length){
      status.innerHTML='❌ No se encontró portada automática.<br/><span style="font-size:.68rem">Puedes subir la imagen manualmente desde la otra pestaña.</span>';
      return;
    }
    status.textContent=`✅ ${games.length} resultado(s) — toca la portada correcta:`;
    results.innerHTML=games.map(g=>`
      <div class="cover-opt" onclick="selectCover('${g.background_image.replace(/'/g,"\\'")}','${(g.name||'').replace(/'/g,"\\'")}')"
           style="cursor:pointer;border-radius:6px;overflow:hidden;border:2px solid transparent;transition:.2s" title="${g.name||''}">
        <img src="${g.background_image}" style="width:100%;aspect-ratio:3/4;object-fit:cover;display:block" onerror="this.parentElement.style.display='none'"/>
        <div style="font-size:.58rem;padding:3px 4px;background:#111;color:#ccc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name||''}</div>
      </div>`).join('');
  }catch(e){
    status.innerHTML='⚠️ Error de conexión. Usa la pestaña manual.';
  }
}
async function selectCover(url){
  document.getElementById('cover-status').textContent='⬇️ Descargando imagen...';
  try{
    const res=await fetch(url);
    const blob=await res.blob();
    const b64=await new Promise(r=>{const fr=new FileReader();fr.onload=e=>r(e.target.result);fr.readAsDataURL(blob);});
    document.getElementById('ag-img-b64').value=b64;
    document.getElementById('cover-selected-img').src=b64;
    document.getElementById('cover-selected-wrap').style.display='block';
    document.getElementById('cover-status').innerHTML='✅ Portada lista — si no es la correcta, elige otra o usa la pestaña manual.';
  }catch(e){
    document.getElementById('cover-status').textContent='⚠️ No se pudo descargar. Elige otra o súbela manualmente.';
  }
}
function clearCoverSelected(){
  document.getElementById('ag-img-b64').value='';
  document.getElementById('cover-selected-wrap').style.display='none';
  document.getElementById('cover-selected-img').src='';
  document.getElementById('cover-results').innerHTML='';
  document.getElementById('cover-status').textContent='';
}
function resetCoverTabs(){
  switchCoverTab('manual');
  clearCoverSelected();
  resetImgField('ag-img-file','ag-img-prev','ag-img-b64');
}

/* ══════════════════════════════
   IMAGE UPLOAD HELPERS
══════════════════════════════ */
function previewImg(input,prevId,b64Id){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=document.getElementById(prevId);
    if(img){img.src=e.target.result;img.style.display='block';}
    const b64=document.getElementById(b64Id);
    if(b64) b64.value=e.target.result;
    const txt=input.closest('.img-upload-field')?.querySelector('.img-upload-txt');
    if(txt) txt.style.display='none';
  };
  reader.readAsDataURL(file);
}
function resetImgField(fileId,prevId,b64Id){
  const f=document.getElementById(fileId);
  const p=document.getElementById(prevId);
  const b=document.getElementById(b64Id);
  if(f) f.value='';
  if(p){p.style.display='none';p.src='';}
  if(b) b.value='';
  const txt=f?.closest('.img-upload-field')?.querySelector('.img-upload-txt');
  if(txt) txt.style.display='';
}
function setImgField(b64,fileId,prevId,b64Id){
  if(!b64) return;
  const p=document.getElementById(prevId);
  const b=document.getElementById(b64Id);
  if(p){p.src=b64;p.style.display='block';}
  if(b) b.value=b64;
  const f=document.getElementById(fileId);
  const txt=f?.closest('.img-upload-field')?.querySelector('.img-upload-txt');
  if(txt) txt.style.display='none';
}

/* ══════════════════════════════
   AUTH
══════════════════════════════ */
function doLogin(){
  const u=document.getElementById('lu').value.trim().toLowerCase();
  const p=document.getElementById('lp').value;
  const found=ADMINS.find(a=>a.user===u&&a.pass===sh(p));
  if(!found){document.getElementById('lerr').classList.add('on');document.getElementById('lp').value='';return;}
  role='admin';
  sessionStorage.setItem('eg_role','admin');
  sessionStorage.setItem('eg_admin_name',found.display);
  document.getElementById('lerr').classList.remove('on');
  cMod('m-login');
  applyAdminUI(found.display);
  toast('¡Bienvenido, '+found.display+'! 👑','s');
}
window.doLogin = doLogin;
function applyAdminUI(displayName){
  document.body.classList.add('is-admin');
  const a=document.getElementById('btn-login-nav'); if(a) a.style.display='none';
  const h=document.getElementById('btn-login-hint'); if(h) h.style.display='none';
  const l=document.getElementById('btn-logout'); if(l) l.classList.add('on');
  const mbau=document.getElementById('mb-au'); if(mbau) mbau.style.display='block';
  const mbing=document.getElementById('mb-ing'); if(mbing) mbing.style.display='block';
  const ba=document.getElementById('ba-add'); if(ba) ba.style.display='flex';
  const bf=document.getElementById('bf-add'); if(bf) bf.style.display='flex';
  const br=document.getElementById('br-add'); if(br) br.style.display='flex';
  const lu=document.getElementById('lu'); if(lu) lu.value='';
  const lp=document.getElementById('lp'); if(lp) lp.value='';
  // Admin-only page content (e.g. ingresos.html, adminusers.html)
  const noAccess=document.getElementById('no-access'); if(noAccess) noAccess.style.display='none';
  const ingContent=document.getElementById('ingresos-content');
  if(ingContent){ingContent.style.display='block'; if(typeof rIngresos==='function') rIngresos();}
  const auContent=document.getElementById('adminusers-content');
  if(auContent){auContent.style.display='block'; if(typeof rUsers==='function') rUsers();}
  const printContent=document.getElementById('imprimir-content');
  if(printContent){printContent.style.display='block'; if(typeof iPrint==='function') iPrint();}
}
document.addEventListener('DOMContentLoaded',()=>{
  // Restore admin session on page load
  if(role==='admin'){
    applyAdminUI(sessionStorage.getItem('eg_admin_name')||'Administrador');
  }
  document.getElementById('btn-logout')?.addEventListener('click',()=>{
    role='guest';
    sessionStorage.removeItem('eg_role');
    sessionStorage.removeItem('eg_admin_name');
    document.body.classList.remove('is-admin');
    const a=document.getElementById('btn-login-nav'); if(a) a.style.display='';
    const h=document.getElementById('btn-login-hint'); if(h) h.style.display='';
    document.getElementById('btn-logout').classList.remove('on');
    const mbau=document.getElementById('mb-au'); if(mbau) mbau.style.display='none';
    const mbing=document.getElementById('mb-ing'); if(mbing) mbing.style.display='none';
    const ba=document.getElementById('ba-add'); if(ba) ba.style.display='none';
    const bf=document.getElementById('bf-add'); if(bf) bf.style.display='none';
    const br=document.getElementById('br-add'); if(br) br.style.display='none';
    toast('Sesión cerrada','s');
    // If on admin-only page, redirect to puesto
    if(document.body.dataset.adminOnly==='true'){
      setTimeout(()=>{ window.location.href = document.body.dataset.adminRedirect || 'puesto.html'; },600);
    }
  });
});

/* ══════════════════════════════
   CATALOG
══════════════════════════════ */
let aDisk='Todos';
function iCat(){
  document.getElementById('ctabs').innerHTML=Object.keys(GDB).map(c=>{
    const n=Object.values(GDB[c]||{}).flat().length;
    return `<div class="ctab ${c===aCon?'on':''}" onclick="setCon('${c}')"><i class="${cIco(c)}"></i> ${c}${n?`<span class="cn">${n}</span>`:''}</div>`;
  }).join('');
  aDisk='Todos';
  renderDiskTabs();
  rG();
}
window.iCat = iCat;
function renderDiskTabs(){
  const wrap=document.getElementById('disktabs');
  if(!wrap) return;
  const disks=Object.keys(GDB[aCon]||{});
  wrap.style.display='flex';
  let html = `<div class="ctab ${aDisk==='Todos'?'on':''}" onclick="setDisk('Todos')"><i class="fas fa-layer-group"></i> Todos</div>`;
  html += disks.map(d=>`<div class="ctab ${aDisk===d?'on':''}" onclick="setDisk('${escAttr(d)}')"><i class="fas fa-hdd"></i> ${d}<span class="cn">${(GDB[aCon][d]||[]).length}</span></div>`).join('');
  if(role==='admin'){
    html += `<div class="ctab" style="border-color:rgba(124,58,237,.35);color:#a78bfa" onclick="openManageDisks()"><i class="fas fa-sliders-h"></i> Gestionar discos</div>`;
  }
  wrap.innerHTML = html;
}
function setDisk(d){aDisk=d;renderDiskTabs();rG();}
function cIco(c){return c.startsWith('PS')?'fab fa-playstation':c==='Switch'||c==='Wii'?'fas fa-gamepad':'fab fa-xbox';}
function setCon(c){aCon=c;document.getElementById('sinp').value='';iCat();}

/* ── Gestionar discos por consola ── */
function openManageDisks(){
  document.getElementById('md-con').textContent=aCon;
  renderManageDisksList();
  oMod('m-manage-disks');
}
function renderManageDisksList(){
  const disks=Object.keys(GDB[aCon]||{});
  const wrap=document.getElementById('md-list');
  if(!disks.length){
    wrap.innerHTML=`<p style="font-size:.8rem;color:var(--mu);text-align:center;padding:16px 0">Sin discos registrados para ${aCon} todavía.</p>`;
  } else {
    wrap.innerHTML=disks.map(d=>`
      <div class="user-row" style="margin-bottom:8px">
        <div class="u-avatar" style="background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.25);color:var(--cy)"><i class="fas fa-hdd"></i></div>
        <div class="ui"><div class="un">${d}</div><div class="ur">${(GDB[aCon][d]||[]).length} juego(s)</div></div>
        <button class="sbtn dl" onclick="deleteDisk('${escAttr(d)}')"><i class="fas fa-trash"></i> Eliminar</button>
      </div>`).join('');
  }
}
function addDisk(){
  const inp=document.getElementById('md-new');
  let name=inp.value.trim();
  if(!name){toast('Escribe un nombre para el disco','e');return;}
  if(!/^disco/i.test(name)) name = 'DISCO ' + name;
  if(!GDB[aCon]) GDB[aCon]={};
  if(GDB[aCon][name]){toast('Ese disco ya existe','e');return;}
  GDB[aCon][name]=[];
  save();
  inp.value='';
  renderManageDisksList();
  renderDiskTabs();
  toast('"'+name+'" agregado a '+aCon+' ✅','s');
}
function deleteDisk(name){
  const games=GDB[aCon][name]||[];
  if(games.length){
    if(!confirm('"'+name+'" tiene '+games.length+' juego(s). ¿Eliminar el disco y todos sus juegos?')) return;
  } else {
    if(!confirm('¿Eliminar "'+name+'"?')) return;
  }
  games.forEach(g=>delete GIMGS[aCon+'::'+g]);
  delete GDB[aCon][name];
  save();
  if(aDisk===name) aDisk='Todos';
  renderManageDisksList();
  renderDiskTabs();
  rG();
  toast('"'+name+'" eliminado','s');
}


function rG(){
  const q=document.getElementById('sinp').value.trim().toLowerCase();
  const discos=GDB[aCon]||{};
  let all=[];
  Object.entries(discos).forEach(([disk,gs])=>gs.forEach(g=>all.push({name:g,disk})));
  if(aDisk!=='Todos') all=all.filter(g=>g.disk===aDisk);
  all.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const fil=q?all.filter(g=>g.name.toLowerCase().includes(q)):all;
  document.getElementById('sc').textContent=fil.length+' juego'+(fil.length!==1?'s':'');
  const grid=document.getElementById('ggrid');

  if(!all.length){
    grid.innerHTML=`<div class="empty"><i class="fas fa-compact-disc"></i><p>Sin juegos para <strong>${aCon}</strong>${aDisk!=='Todos'?' en '+aDisk:''}.</p></div>`;
    return;
  }
  if(!fil.length){
    grid.innerHTML=`<div class="empty"><i class="fas fa-search"></i><p>No se encontró "<strong>${q}</strong>" — juego no disponible.</p></div>`;
    return;
  }
  function hl(t){if(!q)return t;return t.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');}
  const key=aCon+'::';
  grid.innerHTML=fil.map(g=>{
    const img=GIMGS[key+g.name]||'';
    const safeId=btoa(encodeURIComponent(g.name)).replace(/[^a-zA-Z0-9]/g,'');
    const nameAttr=escAttr(g.name);
    const diskAttr=escAttr(g.disk);
    return `<div class="gc">
      <div class="gc-imgw">
        <div class="gc-actions">
          <button type="button" class="ca-btn cam" data-act="upload-game" data-con="${aCon}" data-name="${nameAttr}" title="Subir portada"><i class="fas fa-camera"></i></button>
          <button type="button" class="ca-btn edit" data-act="edit-game" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}" title="Editar"><i class="fas fa-pen"></i></button>
          <button type="button" class="ca-btn del" data-act="del-game" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${img?`<img src="${img}" alt="${nameAttr}" style="width:100%;height:100%;object-fit:cover;display:block"/>`:
          `<div class="gc-ph"><i class="fas fa-compact-disc"></i><span style="font-size:.6rem">${g.name.substring(0,18)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="gimg-${safeId}" data-con="${aCon}" data-name="${nameAttr}" onchange="saveGameImg(this.dataset.con,this.dataset.name,this)"/>
      </div>
      <div class="gc-body" data-act="open-disk" data-con="${aCon}" data-disk="${diskAttr}" data-name="${nameAttr}">
        <div class="gc-name">${hl(g.name)}</div>
        <div class="gc-disk">
          <span class="dbadge"><i class="fas fa-hdd"></i> ${g.disk}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* Event delegation for catalog game cards (handles names with apostrophes/quotes safely) */
document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.getElementById('ggrid');
  if(!grid) return;
  grid.addEventListener('click',(e)=>{
    const el=e.target.closest('[data-act]');
    if(!el) return;
    const act=el.dataset.act, con=el.dataset.con, disk=el.dataset.disk, name=el.dataset.name;
    if(act==='upload-game'){ uploadGameImg(con,name); }
    else if(act==='edit-game'){ editGame(con,disk,name); }
    else if(act==='del-game'){ delGame(con,disk,name); }
    else if(act==='open-disk'){ openDiskModal(con,disk,name); }
  });
});

/* ── Disk detail modal ── */
let currentDiskModalInfo=null;
function openDiskModal(con,disk,clickedName,e){
  if(e) e.stopPropagation();
  currentDiskModalInfo={con,disk};
  const games=GDB[con]?.[disk]||[];
  document.getElementById('dm-title').textContent=disk+' — '+con;
  document.getElementById('dm-count').textContent=games.length+' juegos en este disco'+(role==='admin'?' · usa las flechas para reordenar':'');
  const list=document.getElementById('dm-list');
  list.innerHTML=games.map((g,i)=>{
    const isHL = clickedName && g.toLowerCase()===clickedName.toLowerCase();
    const reorderBtns = role==='admin' ? `
      <div style="display:flex;flex-direction:column;gap:2px;flex-shrink:0">
        <button type="button" class="dli-move" onclick="moveDiskGame(${i},-1)" ${i===0?'disabled':''} title="Subir"><i class="fas fa-chevron-up"></i></button>
        <button type="button" class="dli-move" onclick="moveDiskGame(${i},1)" ${i===games.length-1?'disabled':''} title="Bajar"><i class="fas fa-chevron-down"></i></button>
      </div>` : '';
    return `<div class="disk-list-item ${isHL?'highlighted':''}" id="dli-${i}">
      ${reorderBtns}
      <span class="dli-num">${i+1}</span>
      <span class="dli-name">${g}</span>
      ${isHL?'<i class="fas fa-arrow-left" style="color:var(--cy);font-size:.75rem"></i>':''}
    </div>`;
  }).join('');
  oMod('m-disk');
  if(clickedName){
    setTimeout(()=>{
      const found=list.querySelector('.highlighted');
      if(found) found.scrollIntoView({behavior:'smooth',block:'center'});
    },150);
  }
}
function moveDiskGame(index, dir){
  if(!currentDiskModalInfo) return;
  const {con,disk}=currentDiskModalInfo;
  const arr=GDB[con]?.[disk];
  if(!arr) return;
  const newIndex=index+dir;
  if(newIndex<0 || newIndex>=arr.length) return;
  [arr[index],arr[newIndex]]=[arr[newIndex],arr[index]];
  save();
  openDiskModal(con,disk,null);
  // Refresh catalog cards behind the modal too (order may have changed)
  if(typeof rG==='function') rG();
}

/* ── Upload game image ── */
function uploadGameImg(con,name){
  const safeId=btoa(encodeURIComponent(name)).replace(/[^a-zA-Z0-9]/g,'');
  document.getElementById('gimg-'+safeId)?.click();
}
function saveGameImg(con,name,input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{GIMGS[con+'::'+name]=ev.target.result;save();rG();toast('Imagen guardada ✅','s');};
  r.readAsDataURL(file);
}

/* ── Add/Edit game ── */
let editGameData=null;
function refreshDiskOptions(con, selectedDisk){
  const sel=document.getElementById('ag-d');
  const disks=Object.keys(GDB[con]||{});
  if(!disks.length) disks.push('DISCO 1');
  sel.innerHTML = disks.map(d=>`<option value="${escAttr(d)}">${d}</option>`).join('')
    + `<option value="__new__">+ Crear nuevo disco...</option>`;
  if(selectedDisk && disks.includes(selectedDisk)) sel.value=selectedDisk;
  else sel.value=disks[0];
}
function onAgDiskChange(){
  const sel=document.getElementById('ag-d');
  if(sel.value==='__new__'){
    const name=prompt('Nombre del nuevo disco (ej: DISCO 8):');
    if(name && name.trim()){
      const con=document.getElementById('ag-c').value;
      const clean = /^disco/i.test(name.trim()) ? name.trim() : 'DISCO '+name.trim();
      if(!GDB[con]) GDB[con]={};
      if(!GDB[con][clean]) GDB[con][clean]=[];
      save();
      refreshDiskOptions(con, clean);
    } else {
      refreshDiskOptions(document.getElementById('ag-c').value);
    }
  }
}
function onAgConsoleChange(){
  refreshDiskOptions(document.getElementById('ag-c').value);
}
function openAddGame(){
  editGameData=null;
  document.getElementById('ag-tit').textContent='Agregar Juego';
  document.getElementById('ag-ico').className='fas fa-plus';
  document.getElementById('ag-n').value='';
  document.getElementById('ag-c').value=aCon;
  document.getElementById('ag-genre').value='';
  refreshDiskOptions(aCon, aDisk!=='Todos'?aDisk:null);
  resetCoverTabs();
  oMod('m-ag');setTimeout(()=>document.getElementById('ag-n').focus(),100);
}
window.openAddGame = openAddGame;
function editGame(con,disk,name){
  editGameData={con,disk,name};
  document.getElementById('ag-tit').textContent='Editar Juego';
  document.getElementById('ag-ico').className='fas fa-pen';
  document.getElementById('ag-n').value=name;
  document.getElementById('ag-c').value=con;
  document.getElementById('ag-genre').value=GENRES[name]||'';
  refreshDiskOptions(con, disk);
  resetCoverTabs();
  const img=GIMGS[con+'::'+name]||'';
  if(img){
    document.getElementById('ag-img-b64').value=img;
    document.getElementById('cover-selected-img').src=img;
    document.getElementById('cover-selected-wrap').style.display='block';
  }
  oMod('m-ag');
}
function saveGame(){
  const newName=document.getElementById('ag-n').value.trim();
  const con=document.getElementById('ag-c').value;
  const disk=document.getElementById('ag-d').value;
  const img=document.getElementById('ag-img-b64').value;
  const genre=document.getElementById('ag-genre').value;
  if(!newName){toast('Escribe el nombre del juego','e');return;}
  if(!GDB[con])GDB[con]={};
  if(!GDB[con][disk])GDB[con][disk]=[];
  if(editGameData){
    GDB[editGameData.con][editGameData.disk]=GDB[editGameData.con][editGameData.disk].filter(g=>g!==editGameData.name);
    delete GIMGS[editGameData.con+'::'+editGameData.name];
    if(editGameData.name!==newName) delete GENRES[editGameData.name];
  }
  if(!GDB[con][disk].includes(newName)) GDB[con][disk].push(newName);
  if(img) GIMGS[con+'::'+newName]=img;
  if(genre) setGenre(newName, genre); else delete GENRES[newName];
  save();cMod('m-ag');resetImgField('ag-img-file','ag-img-prev','ag-img-b64');
  if(con===aCon){rG();iCat();}
  toast(newName+(editGameData?' actualizado':' agregado')+' ✅','s');
  editGameData=null;
}
window.saveGame = saveGame;
function delGame(con,disk,name){
  if(!confirm('¿Eliminar "'+name+'" de '+disk+'?'))return;
  GDB[con][disk]=GDB[con][disk].filter(g=>g!==name);
  delete GIMGS[con+'::'+name];
  delete GENRES[name];
  save();rG();iCat();toast('"'+name+'" eliminado','s');
}

/* ══════════════════════════════
   ARTÍCULOS
══════════════════════════════ */
function rACats(){
  const cats=['Todos',...new Set(ARTS.map(a=>a.cat).filter(Boolean))];
  document.getElementById('acattabs').innerHTML=cats.map(c=>
    `<div class="ctb ${c===aArtCat?'on':''}" onclick="setArtCat('${c}')">${c}</div>`).join('');
}
function setArtCat(c){aArtCat=c;rACats();rA();}
function rA(){
  const q=document.getElementById('ainp').value.trim().toLowerCase();
  let items=aArtCat==='Todos'?ARTS:ARTS.filter(a=>a.cat===aArtCat);
  if(q)items=items.filter(a=>a.name.toLowerCase().includes(q));
  const g=document.getElementById('agrid');
  if(!items.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1"><i class="fas fa-tags"></i><p>${role==='admin'?'Agrega el primer artículo.':'Sin artículos aún.'}</p></div>`;return;}
  g.innerHTML=items.map(a=>`
    <div class="ac">
      <div class="ac-imgw">
        <div class="ac-actions">
          <button class="ca-btn cam" onclick="uploadArtImg(${a.id},event)" title="Subir imagen"><i class="fas fa-camera"></i></button>
          <button class="ca-btn edit" onclick="editArt(${a.id})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="ca-btn del" onclick="delArt(${a.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${a.img?`<img src="${a.img}" alt="${escAttr(a.name)}"/>`:
          `<div class="ac-ph"><i class="fas fa-image"></i><span>${a.name.substring(0,14)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="aimg-${a.id}" onchange="saveArtImg(${a.id},this)"/>
      </div>
      <div class="ac-body">
        <div class="ac-name">${a.name}</div>
        <div class="ac-price">${a.price} Bs.</div>
        <div class="ac-cat">${a.cat||''}</div>
      </div>
    </div>`).join('');
}
function uploadArtImg(id,e){e.stopPropagation();document.getElementById('aimg-'+id)?.click();}
function saveArtImg(id,input){
  const file=input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=ev=>{const a=ARTS.find(x=>x.id===id);if(a){a.img=ev.target.result;save();rA();toast('Imagen guardada ✅','s');}};
  r.readAsDataURL(file);
}
function openArtModal(item=null){
  document.getElementById('aa-tit').textContent=item?'Editar Artículo':'Agregar Artículo';
  document.getElementById('aa-eid').value=item?item.id:'';
  document.getElementById('aa-n').value=item?item.name:'';
  document.getElementById('aa-p').value=item?item.price:'';
  document.getElementById('aa-c').value=item?item.cat:'';
  item?.img?setImgField(item.img,'aa-img-file','aa-img-prev','aa-img-b64'):resetImgField('aa-img-file','aa-img-prev','aa-img-b64');
  oMod('m-aa');
}
function editArt(id){const a=ARTS.find(x=>x.id===id);if(a)openArtModal(a);}
function saveArt(){
  const eid=document.getElementById('aa-eid').value;
  const name=document.getElementById('aa-n').value.trim();
  const price=document.getElementById('aa-p').value.trim();
  const cat=document.getElementById('aa-c').value.trim();
  const img=document.getElementById('aa-img-b64').value;
  if(!name||!price){toast('Nombre y precio requeridos','e');return;}
  if(eid){const a=ARTS.find(x=>x.id===parseInt(eid));if(a){a.name=name;a.price=price;a.cat=cat;if(img)a.img=img;}}
  else ARTS.push({id:Date.now(),name,price,cat,img:img||''});
  save();cMod('m-aa');resetImgField('aa-img-file','aa-img-prev','aa-img-b64');
  rACats();rA();toast(name+(eid?' actualizado':' agregado')+' ✅','s');
}
function delArt(id){if(!confirm('¿Eliminar?'))return;ARTS=ARTS.filter(a=>a.id!==id);save();rA();rACats();toast('Eliminado','s');}

/* ══════════════════════════════
   FÍSICOS
══════════════════════════════ */
function rF(){
  const q=document.getElementById('finp').value.trim().toLowerCase();
  let items=q?FISI.filter(f=>f.name.toLowerCase().includes(q)):FISI;
  const g=document.getElementById('fgrid');
  if(!items.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1"><i class="fas fa-compact-disc"></i><p>${role==='admin'?'Agrega el primer juego físico.':'Sin juegos físicos aún.'}</p></div>`;return;}
  g.innerHTML=items.map(f=>`
    <div class="ac">
      <div class="ac-imgw">
        <div class="ac-actions">
          <button class="ca-btn cam" onclick="uploadFisImg(${f.id},event)" title="Subir imagen"><i class="fas fa-camera"></i></button>
          <button class="ca-btn edit" onclick="editFis(${f.id})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="ca-btn del" onclick="delFis(${f.id})" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
        ${f.img?`<img src="${f.img}" alt="${escAttr(f.name)}"/>`:
          `<div class="ac-ph"><i class="fas fa-compact-disc"></i><span>${f.name.substring(0,14)}</span></div>`}
        <input type="file" accept="image/*" style="display:none" id="fimg-${f.id}" onchange="saveFisImg(${f.id},this)"/>
      </div>
      <div class="ac-body">
        <div class="ac-name">${f.name}</div>
        <div class="ac-price" style="color:#10b981">${f.price} Bs.</div>
        <div class="ac-cat">PS4 Físico</div>
      </div>
    </div>`).join('');
}
function uploadFisImg(id,e){e.stopPropagation();document.getElementById('fimg-'+id)?.click();}
function saveFisImg(id,input){const file=input.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{const f=FISI.find(x=>x.id===id);if(f){f.img=ev.target.result;save();rF();toast('Imagen guardada ✅','s');}};r.readAsDataURL(file);}
function openFisModal(item=null){
  document.getElementById('af-tit').textContent=item?'Editar Juego Físico':'Agregar Juego Físico';
  document.getElementById('af-eid').value=item?item.id:'';
  document.getElementById('af-n').value=item?item.name:'';
  document.getElementById('af-p').value=item?item.price:'';
  item?.img?setImgField(item.img,'af-img-file','af-img-prev','af-img-b64'):resetImgField('af-img-file','af-img-prev','af-img-b64');
  oMod('m-af');
}
function editFis(id){const f=FISI.find(x=>x.id===id);if(f)openFisModal(f);}
function saveFis(){
  const eid=document.getElementById('af-eid').value;
  const name=document.getElementById('af-n').value.trim();
  const price=document.getElementById('af-p').value.trim();
  const img=document.getElementById('af-img-b64').value;
  if(!name||!price){toast('Nombre y precio requeridos','e');return;}
  if(eid){const f=FISI.find(x=>x.id===parseInt(eid));if(f){f.name=name;f.price=price;if(img)f.img=img;}}
  else FISI.push({id:Date.now(),name,price,img:img||''});
  save();cMod('m-af');resetImgField('af-img-file','af-img-prev','af-img-b64');
  rF();toast(name+(eid?' actualizado':' agregado')+' ✅','s');
}
function delFis(id){if(!confirm('¿Eliminar?'))return;FISI=FISI.filter(f=>f.id!==id);save();rF();toast('Eliminado','s');}

/* ══════════════════════════════
   REPARACIONES
══════════════════════════════ */
function rRFil(){
  const cats=['Todos',...new Set(REPS.map(r=>r.console))];
  document.getElementById('rfilbtns').innerHTML=cats.map(c=>
    `<div class="ctb ${c===aRepCon?'on':''}" style="${c===aRepCon?'border-color:var(--dn);color:var(--dn);background:rgba(255,71,87,.07)':''}" onclick="setRepCon('${c}')">${c}</div>`).join('');
}
function setRepCon(c){aRepCon=c;rRFil();rR();}
function rR(){
  const q=document.getElementById('rinp').value.trim().toLowerCase();
  let items=aRepCon==='Todos'?REPS:REPS.filter(r=>r.console===aRepCon);
  if(q)items=items.filter(r=>r.name.toLowerCase().includes(q)||r.console.toLowerCase().includes(q));
  const g=document.getElementById('rgrid');
  if(!items.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1"><i class="fas fa-wrench"></i><p>Sin servicios.</p></div>`;return;}
  g.innerHTML=items.map(r=>`
    <div class="rc">
      <div class="rc-acts">
        <button class="sbtn ed" onclick="editRep(${r.id})"><i class="fas fa-pen"></i></button>
        <button class="sbtn dl" onclick="delRep(${r.id})"><i class="fas fa-trash"></i></button>
      </div>
      <div class="rc-con">${r.console}</div>
      <div class="rc-name">${r.name}</div>
      <div class="rc-price">${r.price}</div>
      ${r.desc?`<div class="rc-desc">${r.desc}</div>`:''}
    </div>`).join('');
}
function openRepModal(item=null){
  document.getElementById('ar-tit').textContent=item?'Editar Servicio':'Agregar Servicio';
  document.getElementById('ar-eid').value=item?item.id:'';
  document.getElementById('ar-n').value=item?item.name:'';
  document.getElementById('ar-c').value=item?item.console:'';
  document.getElementById('ar-p').value=item?item.price:'';
  document.getElementById('ar-d').value=item?item.desc||'':'';
  oMod('m-ar');
}
function editRep(id){const r=REPS.find(x=>x.id===id);if(r)openRepModal(r);}
function saveRep(){
  const eid=document.getElementById('ar-eid').value;
  const name=document.getElementById('ar-n').value.trim();
  const con=document.getElementById('ar-c').value.trim();
  const price=document.getElementById('ar-p').value.trim();
  const desc=document.getElementById('ar-d').value.trim();
  if(!name||!con||!price){toast('Nombre, consola y precio requeridos','e');return;}
  if(eid){const r=REPS.find(x=>x.id===parseInt(eid));if(r){r.name=name;r.console=con;r.price=price;r.desc=desc;}}
  else REPS.push({id:Date.now(),name,console:con,price,desc});
  save();cMod('m-ar');rRFil();rR();toast(name+(eid?' actualizado':' agregado')+' ✅','s');
}
function delRep(id){if(!confirm('¿Eliminar?'))return;REPS=REPS.filter(r=>r.id!==id);save();rRFil();rR();toast('Eliminado','s');}

/* ══════════════════════════════
   FLASHEO
══════════════════════════════ */
function rFlash(){
  const grid=document.getElementById('flasgrid');
  let html=GUIDES.map((g,i)=>`
    <div class="fc" onclick="openGuide(${g.id})">
      ${role==='admin'?`<div class="rc-acts" style="display:flex;top:10px;right:10px">
        <button class="sbtn ed" onclick="editGuide(${g.id},event)"><i class="fas fa-pen"></i></button>
        <button class="sbtn dl" onclick="delGuide(${g.id},event)"><i class="fas fa-trash"></i></button>
      </div>`:''}
      <div class="fc-ic"><i class="fas fa-book-open"></i></div>
      <div class="fc-con">${g.console}</div>
      <div class="fc-tit">${g.title}</div>
      <div class="fc-dsc">${g.desc}</div>
    </div>`).join('');
  grid.innerHTML=html;
}
function openGuide(id){
  const g=GUIDES.find(x=>x.id===id);
  if(!g) return;
  document.getElementById('fl-tit').textContent=g.title;
  document.getElementById('fl-sub').textContent=g.desc+' · '+g.console;
  document.getElementById('fl-steps').innerHTML=g.steps.map((s,n)=>
    `<div class="si"><span class="sn">${n+1}</span><span class="st">${s}</span></div>`).join('');
  oMod('m-fl');
}

/* ── Add/Edit/Delete guide ── */
let editGuideId=null;
function openAddGuide(){
  editGuideId=null;
  document.getElementById('ga-tit').textContent='Agregar Guía';
  document.getElementById('ga-ico').className='fas fa-plus';
  document.getElementById('ga-con').value='PS4';
  document.getElementById('ga-title').value='';
  document.getElementById('ga-desc').value='';
  document.getElementById('ga-steps').value='';
  oMod('m-ga');
  setTimeout(()=>document.getElementById('ga-title').focus(),100);
}
function editGuide(id,e){
  if(e) e.stopPropagation();
  const g=GUIDES.find(x=>x.id===id);
  if(!g) return;
  editGuideId=id;
  document.getElementById('ga-tit').textContent='Editar Guía';
  document.getElementById('ga-ico').className='fas fa-pen';
  document.getElementById('ga-con').value=g.console;
  document.getElementById('ga-title').value=g.title;
  document.getElementById('ga-desc').value=g.desc;
  document.getElementById('ga-steps').value=g.steps.join('\n');
  oMod('m-ga');
}
function saveGuide(){
  const con=document.getElementById('ga-con').value;
  const title=document.getElementById('ga-title').value.trim();
  const desc=document.getElementById('ga-desc').value.trim();
  const stepsRaw=document.getElementById('ga-steps').value.trim();
  if(!title||!stepsRaw){toast('Título y pasos son obligatorios','e');return;}
  const steps=stepsRaw.split('\n').map(s=>s.trim()).filter(Boolean);
  if(editGuideId){
    const g=GUIDES.find(x=>x.id===editGuideId);
    if(g){g.console=con;g.title=title;g.desc=desc;g.steps=steps;}
  } else {
    GUIDES.push({id:Date.now(),console:con,title,desc,steps});
  }
  save();cMod('m-ga');rFlash();
  toast(title+(editGuideId?' actualizada':' agregada')+' ✅','s');
  editGuideId=null;
}
function delGuide(id,e){
  if(e) e.stopPropagation();
  if(!confirm('¿Eliminar esta guía?'))return;
  GUIDES=GUIDES.filter(g=>g.id!==id);
  save();rFlash();toast('Guía eliminada','s');
}

/* ══════════════════════════════
   INGRESOS
══════════════════════════════ */
function rIngresos(){
  const filterVal=document.getElementById('ing-filter')?.value||'all';
  let items=INGRESOS.slice().reverse();

  if(filterVal!=='all'){
    items=items.filter(i=>{
      const d=new Date(i.fecha);
      const now=new Date();
      if(filterVal==='week'){const w=new Date();w.setDate(w.getDate()-7);return d>=w;}
      if(filterVal==='month'){return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}
      if(filterVal==='year'){return d.getFullYear()===now.getFullYear();}
      return true;
    });
  }

  // Dashboard stats
  const total=items.reduce((s,i)=>s+Number(i.monto),0);
  const hoy=new Date().toDateString();
  const hoyTotal=items.filter(i=>new Date(i.fecha).toDateString()===hoy).reduce((s,i)=>s+Number(i.monto),0);
  const count=items.length;

  document.getElementById('ing-total').textContent=total.toLocaleString('es')+' Bs.';
  document.getElementById('ing-hoy').textContent=hoyTotal.toLocaleString('es')+' Bs.';
  document.getElementById('ing-count').textContent=count+' registro'+(count!==1?'s':'');

  const list=document.getElementById('ing-list');
  if(!items.length){
    list.innerHTML=`<div class="ing-empty"><i class="fas fa-coins"></i><p style="font-size:.86rem;color:var(--mu)">Sin ingresos registrados aún.</p></div>`;
    return;
  }
  list.innerHTML=items.map(i=>`
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
    </div>`).join('');
}
function fmtFecha(iso){
  const d=new Date(iso);
  return d.toLocaleDateString('es',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+
    ' · '+d.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
}
function addIngreso(){
  const trabajo=document.getElementById('ing-trabajo').value.trim();
  const monto=parseFloat(document.getElementById('ing-monto').value);
  if(!trabajo||!monto||monto<=0){toast('Completa trabajo realizado y monto','e');return;}
  INGRESOS.push({id:Date.now(),trabajo,monto,fecha:new Date().toISOString()});
  save();cMod('m-ing');
  document.getElementById('ing-trabajo').value='';
  document.getElementById('ing-monto').value='';
  rIngresos();toast('+'+monto+' Bs. registrado ✅','s');
}
function delIngreso(id){
  if(!confirm('¿Eliminar este ingreso?'))return;
  INGRESOS=INGRESOS.filter(i=>i.id!==id);save();rIngresos();toast('Ingreso eliminado','s');
}
function printIngresos(){
  const filterVal=document.getElementById('ing-filter')?.value||'all';
  let items=INGRESOS.slice().reverse();
  if(filterVal==='week'){const w=new Date();w.setDate(w.getDate()-7);items=items.filter(i=>new Date(i.fecha)>=w);}
  else if(filterVal==='month'){const n=new Date();items=items.filter(i=>{const d=new Date(i.fecha);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear();});}
  else if(filterVal==='year'){const y=new Date().getFullYear();items=items.filter(i=>new Date(i.fecha).getFullYear()===y);}
  const total=items.reduce((s,i)=>s+Number(i.monto),0);
  const label={all:'Todos los registros',week:'Última semana',month:'Este mes',year:'Este año'}[filterVal]||'';
  document.getElementById('print-area').innerHTML=`
    <div class="ing-print-page">
      <div class="ing-print-title">📊 Reporte de Ingresos — Evolution Games B&R<br/>
        <span style="font-size:10pt;font-weight:400;color:#555">${label} · Generado: ${new Date().toLocaleDateString('es',{day:'numeric',month:'long',year:'numeric'})}</span>
      </div>
      ${items.map(i=>`<div class="ing-print-row"><span>${fmtFecha(i.fecha)}</span><span>${i.trabajo}</span><span style="font-weight:700">+${Number(i.monto).toLocaleString('es')} Bs.</span></div>`).join('')}
      <div class="ing-print-total">TOTAL: ${total.toLocaleString('es')} Bs.</div>
    </div>`;
  setTimeout(()=>window.print(),200);
}
function limpiarIngresos(){
  if(!confirm('⚠️ ¿Limpiar TODOS los ingresos? Esta acción no se puede deshacer.\n\nTe recomendamos imprimir el reporte primero.'))return;
  INGRESOS=[];save();rIngresos();toast('Ingresos limpiados','s');
}

/* ══════════════════════════════
   IMPRIMIR CATÁLOGO
══════════════════════════════ */
let PRINTED = JSON.parse(localStorage.getItem('eg_printed')||'{}'); // {con: [names]}

function iPrint(){
  pCon = pCon || aCon || 'PS4';
  document.getElementById('pcon-tabs').innerHTML=Object.keys(GDB).map(c=>{
    const n=Object.values(GDB[c]||{}).flat().length;
    return `<div class="ctab ${c===pCon?'on':''}" onclick="setPCon('${c}')">${c}${n?` <span class="cn">${n}</span>`:''}</div>`;
  }).join('');
  renderPrintOpts();
}
function setPCon(c){pCon=c;pnewSelected.clear();iPrint();}
function setPOpt(o){
  pOpt=o;
  document.getElementById('popt-all').className='ctb'+(o==='all'?' on':'');
  document.getElementById('popt-new').className='ctb'+(o==='new'?' on':'');
  document.getElementById('pnew-wrap').style.display=o==='new'?'block':'none';
  if(o==='new') renderNewGamesList();
}
function getAllGamesFor(con){
  const discos=GDB[con]||{};
  let all=[];
  Object.entries(discos).forEach(([disk,gs])=>gs.forEach(g=>all.push({name:g,disk})));
  all.sort((a,b)=>a.name.localeCompare(b.name,'es'));
  return all;
}
function renderPrintOpts(){
  const all=getAllGamesFor(pCon);
  const printedList=PRINTED[pCon]||[];
  const newOnes=all.filter(g=>!printedList.includes(g.name));
  const info=document.getElementById('prange-info');
  if(info) info.textContent=`Total: ${all.length} juegos · Ya impresos: ${printedList.length} · Nuevos sin imprimir: ${newOnes.length}`;
  if(pOpt==='new') renderNewGamesList();
}
let pnewSelected = new Set();
function renderNewGamesList(){
  const all=getAllGamesFor(pCon);
  const printedList=PRINTED[pCon]||[];
  let newOnes=all.filter(g=>!printedList.includes(g.name));
  const q=document.getElementById('pnew-search')?.value.trim().toLowerCase()||'';
  const filtered = q ? newOnes.filter(g=>g.name.toLowerCase().includes(q)) : newOnes;
  const wrap=document.getElementById('pnew-list');
  if(!newOnes.length){
    wrap.innerHTML=`<div class="empty" style="padding:30px 16px"><i class="fas fa-check-circle" style="color:var(--ok)"></i><p>¡Ya imprimiste todos los juegos de <strong>${pCon}</strong>! Agrega juegos nuevos para que aparezcan aquí.</p></div>`;
    return;
  }
  function hl(t){if(!q)return t;return t.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');}
  const selCount=[...pnewSelected].filter(n=>newOnes.some(g=>g.name===n)).length;
  wrap.innerHTML=`
    <div class="sbox" style="margin-bottom:10px">
      <i class="fas fa-search"></i>
      <input type="text" id="pnew-search" placeholder="Buscar juego para imprimir..." value="${escAttr(q)}" oninput="renderNewGamesList()"/>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
      <span style="font-size:.74rem;color:var(--mu)">${filtered.length} de ${newOnes.length} · ${selCount} seleccionado(s)</span>
      <div style="display:flex;gap:6px">
        <button class="sbtn ed" onclick="togglePNewAll(true)">Seleccionar ${q?'estos':'todos'}</button>
        <button class="sbtn dl" onclick="togglePNewAll(false)">Quitar ${q?'estos':'todos'}</button>
      </div>
    </div>
    <div class="disk-list-wrap" style="max-height:280px">
      ${filtered.length ? filtered.map((g,i)=>`
        <label class="disk-list-item" style="cursor:pointer">
          <input type="checkbox" class="pnew-chk" value="${encodeURIComponent(g.name)}" data-disk="${escAttr(g.disk)}" ${pnewSelected.has(g.name)?'checked':''} onchange="onPNewCheck(this)" style="accent-color:var(--cy);cursor:pointer"/>
          <span class="dli-num">${i+1}</span>
          <span class="dli-name">${hl(g.name)}</span>
          <span class="dbadge"><i class="fas fa-hdd"></i> ${g.disk}</span>
        </label>`).join('') : `<div class="empty" style="padding:20px 12px"><i class="fas fa-search"></i><p style="font-size:.8rem">Sin resultados para "${q}".</p></div>`}
    </div>`;
  // Restore focus to search input after re-render
  const inp=document.getElementById('pnew-search');
  if(inp && document.activeElement!==inp && q){
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}
function onPNewCheck(chk){
  const name=decodeURIComponent(chk.value);
  if(chk.checked) pnewSelected.add(name);
  else pnewSelected.delete(name);
  renderNewGamesList();
}
function togglePNewAll(state){
  const all=getAllGamesFor(pCon);
  const printedList=PRINTED[pCon]||[];
  const newOnes=all.filter(g=>!printedList.includes(g.name));
  const q=document.getElementById('pnew-search')?.value.trim().toLowerCase()||'';
  const filtered = q ? newOnes.filter(g=>g.name.toLowerCase().includes(q)) : newOnes;
  filtered.forEach(g=>{
    if(state) pnewSelected.add(g.name);
    else pnewSelected.delete(g.name);
  });
  renderNewGamesList();
}
function doPrint(){
  const all=getAllGamesFor(pCon);
  if(!all.length){toast('No hay juegos para '+pCon,'e');return;}
  let items=all;

  if(pOpt==='new'){
    const all=getAllGamesFor(pCon);
    const printedList=PRINTED[pCon]||[];
    const newOnes=all.filter(g=>!printedList.includes(g.name));
    const selected=newOnes.filter(g=>pnewSelected.has(g.name));
    if(!selected.length){toast('Selecciona al menos un juego nuevo','e');return;}
    items=selected;
  }

  if(!items.length){toast('No hay juegos para imprimir','e');return;}

  const perPage=9;let pages='';
  for(let i=0;i<items.length;i+=perPage){
    const chunk=items.slice(i,i+perPage);
    pages+=`<div class="pp">${chunk.map(g=>{
      const img=GIMGS[pCon+'::'+g.name]||'';
      return `<div class="pp-card">
        ${img?`<img src="${img}" alt="${escAttr(g.name)}"/>`:
          `<div style="background:#eee;aspect-ratio:3/4;display:flex;align-items:center;justify-content:center;padding:10px;text-align:center;font-size:9pt;color:#555;font-family:Arial">${g.name}</div>`}
        <div class="pp-card-name">${g.name}</div>
      </div>`;}).join('')}</div>`;
  }
  document.getElementById('print-area').innerHTML=pages;
  toast('Generando PDF con '+items.length+' juegos...','s');

  // Mark as printed if "new" mode
  if(pOpt==='new'){
    if(!PRINTED[pCon]) PRINTED[pCon]=[];
    items.forEach(it=>{
      if(!PRINTED[pCon].includes(it.name)) PRINTED[pCon].push(it.name);
      pnewSelected.delete(it.name);
    });
    localStorage.setItem('eg_printed', JSON.stringify(PRINTED));
  }

  setTimeout(()=>{
    window.print();
    setTimeout(()=>{ if(pOpt==='new'){ renderPrintOpts(); } },500);
  },300);
}
function resetPrintedList(){
  if(!confirm('¿Marcar todos los juegos de '+pCon+' como "no impresos"? Útil si quieres reimprimir todo el catálogo.'))return;
  PRINTED[pCon]=[];
  localStorage.setItem('eg_printed', JSON.stringify(PRINTED));
  renderPrintOpts();
  toast('Lista de impresos reiniciada para '+pCon,'s');
}

/* ══════════════════════════════
   ADMIN USERS
══════════════════════════════ */
function addUser(){
  const u=document.getElementById('nu-u').value.trim().toLowerCase();
  const p=document.getElementById('nu-p').value;
  const d=document.getElementById('nu-d').value.trim();
  const err=document.getElementById('uerr');
  if(!u||!p||!d){err.textContent='Completa todos los campos.';err.classList.add('on');return;}
  if(p.length<6){err.textContent='Mínimo 6 caracteres.';err.classList.add('on');return;}
  if(ADMINS.find(a=>a.user===u)){err.textContent='Usuario ya existe.';err.classList.add('on');return;}
  ADMINS.push({user:u,pass:sh(p),display:d});
  save();cMod('m-au');
  ['nu-u','nu-p','nu-d'].forEach(id=>document.getElementById(id).value='');
  err.classList.remove('on');rUsers();toast('Admin "'+d+'" creado ✅','s');
}
function delUser(i){
  if(i===0){toast('No puedes eliminar el admin principal','e');return;}
  if(!confirm('¿Eliminar a "'+ADMINS[i].display+'"?'))return;
  ADMINS.splice(i,1);save();rUsers();toast('Admin eliminado','s');
}
function rUsers(){
  document.getElementById('ulist').innerHTML=ADMINS.map((a,i)=>`
    <div class="urow">
      <div class="uav"><i class="fas fa-crown"></i></div>
      <div class="ui"><div class="un">${a.display}</div><div class="ur">@${a.user} · Administrador</div></div>
      ${i===0?'<span style="font-size:.68rem;color:var(--mu)">Principal</span>':
        `<button class="sbtn dl" onclick="delUser(${i})"><i class="fas fa-trash"></i> Eliminar</button>`}
    </div>`).join('');
}

/* ══════════════════════════════
   TOAST
══════════════════════════════ */
let TT;
function toast(msg,t='s'){
  const el=document.getElementById('toast'),m=document.getElementById('tmsg'),ic=el.querySelector('i');
  m.textContent=msg;el.className='on '+t;
  ic.className=t==='s'?'fas fa-check-circle':'fas fa-times-circle';
  clearTimeout(TT);TT=setTimeout(()=>el.classList.remove('on'),3000);
}

/* ══════════════════════════════
   PARTICLES
══════════════════════════════ */
(function(){
  const c=document.getElementById('pts'),ctx=c.getContext('2d');
  let W,H,p=[];
  function r(){W=c.width=innerWidth;H=c.height=innerHeight;}
  window.addEventListener('resize',r);r();
  class P{
    constructor(){this.rs();}
    rs(){this.x=Math.random()*W;this.y=Math.random()*H;this.r=Math.random()*1.3+.3;this.vx=(Math.random()-.5)*.23;this.vy=(Math.random()-.5)*.23;this.a=Math.random()*.38+.1;}
    up(){this.x+=this.vx;this.y+=this.vy;if(this.x<0||this.x>W||this.y<0||this.y>H)this.rs();}
    dr(){ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle=`rgba(0,212,255,${this.a})`;ctx.fill();}
  }
  for(let i=0;i<70;i++)p.push(new P());
  function loop(){
    ctx.clearRect(0,0,W,H);
    p.forEach(x=>{x.up();x.dr();});
    for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++){
      const dx=p[i].x-p[j].x,dy=p[i].y-p[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<105){ctx.beginPath();ctx.moveTo(p[i].x,p[i].y);ctx.lineTo(p[j].x,p[j].y);ctx.strokeStyle=`rgba(0,212,255,${.09*(1-d/105)})`;ctx.lineWidth=.55;ctx.stroke();}
    }
    requestAnimationFrame(loop);
  }
  loop();
})();

// ══════════════════════════════
//  WHATSAPP CONFIG
//  Cambia estos números por los reales
// ══════════════════════════════
const WHATSAPP_NUMBERS = {
  principal: '59160110595',   // <-- Brandon (WhatsApp Bolivia)
  papa:      '59170000001'    // <-- número de tu papá con código de país, sin + (cámbialo aquí)
};

// ══════════════════════════════
//  LISTA DE TRABAJO (pendientes de cargar)
//  Para anotar qué juegos te pidieron y marcar
//  cuáles ya cargaste, sin perder el hilo.
// ══════════════════════════════
let WORKLIST = JSON.parse(localStorage.getItem('eg_worklist')||'[]');

function saveWorklist(){ localStorage.setItem('eg_worklist', JSON.stringify(WORKLIST)); }

function openWorklist(){
  renderWorklist();
  oMod('m-worklist');
  setTimeout(()=>document.getElementById('wl-input')?.focus(),100);
}
window.openWorklist = openWorklist;
function addWorklistItem(){
  const inp=document.getElementById('wl-input');
  const raw=inp.value.trim();
  if(!raw){toast('Escribe o pega los juegos','e');return;}

  const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);
  let added=0;

  lines.forEach(line=>{
    const clean=cleanWorklistLine(line);
    if(!clean) return;
    // evita duplicados exactos
    if(WORKLIST.some(w=>w.name.toLowerCase()===clean.toLowerCase())) return;
    WORKLIST.push({id:Date.now()+Math.random()+added, name:clean, done:false});
    added++;
  });

  if(!added){toast('No se reconoció ningún juego nuevo en el texto','e');return;}
  saveWorklist();
  inp.value='';
  renderWorklist();
  updateWorklistBadge();
  toast(added===1 ? '1 juego agregado ✅' : added+' juegos agregados ✅','s');
}
/* Limpia una línea de un mensaje de WhatsApp para extraer solo el nombre del juego.
   Quita: números de lista (1. 2) -), encabezados de consola (*PS4:*), líneas de
   "Total: X juego(s)", títulos/branding, asteriscos de negrita, emojis y espacios extra. */
function cleanWorklistLine(line){
  let t=line.trim();
  if(!t) return null;
  // Quita encabezados de consola tipo "*PS4:*", "PS4:", "*Switch:*"
  if(/^\*?(PS\d|PSVita|PSP|Switch|Wii|Xbox\d*)\*?:?\*?\s*$/i.test(t)) return null;
  // Quita líneas de total: "Total: 6 juego(s)"
  if(/^total\s*:?\s*\d+/i.test(t)) return null;
  // Quita líneas de título/branding (contienen "Lista de juegos" o el nombre del negocio)
  if(/lista de juegos|evolution games/i.test(t)) return null;
  // Quita numeración inicial: "1. ", "2) ", "3 - "
  t=t.replace(/^\d+\s*[\.\)\-]\s*/, '');
  // Quita viñetas: "- ", "• ", "* "
  t=t.replace(/^[-•*]\s*/, '');
  // Quita emojis y símbolos sueltos al inicio (no letras/números)
  t=t.replace(/^[^\p{L}\p{N}]+/u, '');
  // Quita asteriscos de negrita de WhatsApp alrededor del texto
  t=t.replace(/^\*+|\*+$/g, '').trim();
  // Quita dos puntos finales sueltos
  t=t.replace(/:\s*$/, '').trim();
  if(!t) return null;
  return t;
}
function toggleWorklistItem(id){
  const item=WORKLIST.find(w=>w.id===id);
  if(item){ item.done=!item.done; saveWorklist(); renderWorklist(); updateWorklistBadge(); }
}
function delWorklistItem(id){
  WORKLIST=WORKLIST.filter(w=>w.id!==id);
  saveWorklist();
  renderWorklist();
  updateWorklistBadge();
}
function clearWorklist(onlyDone){
  if(onlyDone){
    if(!WORKLIST.some(w=>w.done)){toast('No hay juegos marcados como listos','e');return;}
    if(!confirm('¿Quitar todos los juegos marcados como listos?'))return;
    WORKLIST=WORKLIST.filter(w=>!w.done);
  } else {
    if(!WORKLIST.length){toast('La lista ya está vacía','e');return;}
    if(!confirm('¿Borrar toda la lista de trabajo?'))return;
    WORKLIST=[];
  }
  saveWorklist();
  renderWorklist();
  updateWorklistBadge();
  toast('Lista actualizada','s');
}
function renderWorklist(){
  const wrap=document.getElementById('wl-list');
  if(!wrap) return;
  if(!WORKLIST.length){
    wrap.innerHTML=`<div class="cart-empty"><i class="fas fa-clipboard-list"></i><p style="font-size:.84rem">Aún no anotaste juegos.<br/>Escribe arriba y presiona Enter o el botón +.</p></div>`;
    return;
  }
  wrap.innerHTML=WORKLIST.map(item=>`
    <div class="wl-item ${item.done?'done':''}">
      <button type="button" class="wl-check" onclick="toggleWorklistItem(${item.id})" title="${item.done?'Marcar como pendiente':'Marcar como listo'}">
        <i class="fas fa-${item.done?'check':''}"></i>
      </button>
      <span class="wl-name">${item.name}</span>
      <button type="button" class="cart-item-rm" onclick="delWorklistItem(${item.id})"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}
function updateWorklistBadge(){
  const b=document.getElementById('worklist-badge');
  if(!b) return;
  const pending = WORKLIST.filter(w=>!w.done).length;
  b.textContent = pending;
  b.style.display = WORKLIST.length ? 'flex' : 'none';
}

// ══════════════════════════════
//  CART (client catalog)
// ══════════════════════════════
let CART = JSON.parse(localStorage.getItem('eg_cart')||'[]');

function saveCart(){ localStorage.setItem('eg_cart', JSON.stringify(CART)); }

function isInCart(con,name){ return CART.some(c=>c.con===con && c.name===name); }

function toggleCart(con,name,btn){
  const idx = CART.findIndex(c=>c.con===con && c.name===name);
  if(idx>=0){
    CART.splice(idx,1);
    if(btn){btn.classList.remove('added');btn.innerHTML='<i class="fas fa-plus"></i>';}
  } else {
    CART.push({con,name});
    if(btn){btn.classList.add('added');btn.innerHTML='<i class="fas fa-check"></i>';}
  }
  saveCart();
  updateCartBadge();
}

function updateCartBadge(){
  const b=document.getElementById('cart-badge');
  if(b) b.textContent = CART.length;
}

function openCart(){
  const list=document.getElementById('cart-list');
  if(!CART.length){
    list.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-cart"></i><p style="font-size:.84rem">Tu lista está vacía.<br/>Agrega juegos desde el catálogo.</p></div>`;
  } else {
    list.innerHTML = CART.map((c,i)=>`
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

function removeFromCart(i){
  CART.splice(i,1);
  saveCart();
  updateCartBadge();
  openCart();
}

function clearCart(){
  if(!CART.length) return;
  if(!confirm('¿Vaciar toda la lista?')) return;
  CART=[];
  saveCart();
  updateCartBadge();
  openCart();
}

function sendCartToWhatsApp(target='principal'){
  if(!CART.length){toast('Tu lista está vacía','e');return;}
  // group by console
  const byCon={};
  CART.forEach(c=>{ (byCon[c.con] = byCon[c.con]||[]).push(c.name); });
  let msg = '';
  Object.entries(byCon).forEach(([con,games])=>{
    msg += `*${con}:*\n`;
    games.forEach((g,i)=>{ msg += `${i+1}. ${g}\n`; });
    msg += '\n';
  });
  msg += `Total: ${CART.length} juego(s)`;
  const number = WHATSAPP_NUMBERS[target] || WHATSAPP_NUMBERS.principal;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}

// ══════════════════════════════
//  CLIENT CATALOG RENDER (cliente.html / cliente-consola.html)
// ══════════════════════════════
function renderClientConsoles(){
  const grid=document.getElementById('client-console-grid');
  if(!grid) return;
  grid.innerHTML=Object.keys(GDB).map(c=>{
    const n=Object.values(GDB[c]||{}).flat().length;
    const disabled = n===0;
    return `<a href="cliente-catalogo.html?con=${c}" class="ccon-card ${disabled?'disabled':''}" ${disabled?'onclick="return false"':''}>
      <i class="${cIco(c)}"></i>
      <div class="ccon-name">${c}</div>
      <div class="ccon-count">${n?n+' juegos':'Próximamente'}</div>
    </a>`;
  }).join('');
}

let activeClientGenre='Todos';
function renderClientGenreTabs(all){
  const wrap=document.getElementById('client-genre-tabs');
  if(!wrap) return;
  if(!all.length){wrap.innerHTML='';wrap.style.display='none';return;}
  const present=new Set(all.map(g=>getGenre(g.name)));
  const tabs=['Todos',...GENRE_LIST.filter(g=>present.has(g))];
  wrap.style.display='flex';
  wrap.innerHTML=tabs.map(g=>
    `<div class="ctb ${activeClientGenre===g?'on':''}" onclick="setClientGenre('${escAttr(g)}')">${g}</div>`
  ).join('');
}
function setClientGenre(g){
  activeClientGenre=g;
  renderClientGames();
}

function renderClientGames(){
  const grid=document.getElementById('client-ggrid');
  if(!grid) return;
  const params=new URLSearchParams(window.location.search);
  const con=params.get('con')||'PS4';
  aCon=con;
  document.getElementById('client-con-title').textContent=con;

  const q=document.getElementById('sinp')?.value.trim().toLowerCase()||'';
  const discos=GDB[con]||{};
  let all=[];
  const seen=new Set();
  Object.entries(discos).forEach(([disk,gs])=>gs.forEach(g=>{
    if(seen.has(g)) return; // evita duplicados si el juego está en más de un disco
    seen.add(g);
    all.push({name:g,disk});
  }));
  all.sort((a,b)=>a.name.localeCompare(b.name,'es'));

  // Render genre tabs (only for PS4 where we have genre data; still works for any console)
  renderClientGenreTabs(all);

  if(activeClientGenre!=='Todos'){
    all = all.filter(g=>getGenre(g.name)===activeClientGenre);
  }
  const fil=q?all.filter(g=>g.name.toLowerCase().includes(q)):all;

  if(!fil.length && !q){
    grid.innerHTML=`<div class="empty"><i class="fas fa-compact-disc"></i><p>${all.length===0 && activeClientGenre!=='Todos' ? 'Sin juegos de "<strong>'+activeClientGenre+'</strong>" para '+con+'.' : 'Catálogo de <strong>'+con+'</strong> próximamente.'}</p></div>`;
    return;
  }
  if(!fil.length){
    grid.innerHTML=`<div class="empty"><i class="fas fa-search"></i><p>No se encontró "<strong>${q}</strong>".</p></div>`;
    return;
  }
  function hl(t){if(!q)return t;return t.replace(new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi'),'<mark>$1</mark>');}
  const key=con+'::';
  grid.innerHTML=fil.map(g=>{
    const img=GIMGS[key+g.name]||'';
    const inCart=isInCart(con,g.name);
    const nameAttr=escAttr(g.name);
    return `<div class="gc client-gc">
      <div class="gc-imgw">
        ${img?`<img src="${img}" alt="${nameAttr}" style="width:100%;height:100%;object-fit:cover;display:block"/>`:
          `<div class="gc-ph"><i class="fas fa-compact-disc"></i><span style="font-size:.6rem">${g.name.substring(0,18)}</span></div>`}
        <button type="button" class="gc-add ${inCart?'added':''}" data-act="toggle-cart" data-con="${con}" data-name="${nameAttr}">
          <i class="fas fa-${inCart?'check':'plus'}"></i>
        </button>
      </div>
      <div class="gc-body">
        <div class="gc-name">${hl(g.name)}</div>
      </div>
    </div>`;
  }).join('');
}

/* Event delegation for client catalog add-to-cart buttons */
document.addEventListener('DOMContentLoaded',()=>{
  const grid=document.getElementById('client-ggrid');
  if(!grid) return;
  grid.addEventListener('click',(e)=>{
    const el=e.target.closest('[data-act="toggle-cart"]');
    if(!el) return;
    toggleCart(el.dataset.con, el.dataset.name, el);
  });
});
window.oMod = oMod;
window.cMod = cMod;
window.doLogin = doLogin;

window.openFisModal = openFisModal;
window.saveFis = saveFis;

window.openArtModal = openArtModal;
window.saveArt = saveArt;

window.openCart = openCart;
window.sendCartToWhatsApp = sendCartToWhatsApp;
window.clearCart = clearCart;

window.setPOpt = setPOpt;
window.resetPrintedList = resetPrintedList;
window.doPrint = doPrint;

window.openAddGuide = openAddGuide;
window.saveGuide = saveGuide;

window.addUser = addUser;

window.openRepModal = openRepModal;
window.saveRep = saveRep;

window.printIngresos = printIngresos;
window.limpiarIngresos = limpiarIngresos;
window.addIngreso = addIngreso;

window.openAddGame = openAddGame;
window.openWorklist = openWorklist;
window.addWorklistItem = addWorklistItem;
window.clearWorklist = clearWorklist;

window.switchCoverTab = switchCoverTab;
window.buscarPortadaAuto = buscarPortadaAuto;
window.clearCoverSelected = clearCoverSelected;

window.saveGame = saveGame;

window.addDisk = addDisk;
