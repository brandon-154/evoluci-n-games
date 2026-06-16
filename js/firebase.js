// ═══════════════════════════════════════════════
//  EVOLUCIÓN GAMES B&R — Firebase v2
//  Sincronización en tiempo real para TODOS los datos
// ═══════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot, collection
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDT8Ji-f5zlAcXxIZ5LxeLuYb9Nm8VLId4",
  authDomain: "evolution-games-9a607.firebaseapp.com",
  projectId: "evolution-games-9a607",
  storageBucket: "evolution-games-9a607.firebasestorage.app",
  messagingSenderId: "20538679518",
  appId: "1:20538679518:web:677890f654d934a907624f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Nombres de documentos en Firestore ──
const DOCS = {
  catalogo: ['catalogo', 'juegos'],
  imagenes:  ['catalogo', 'imagenes'],
  articulos: ['tienda', 'articulos'],
  fisicos:   ['tienda', 'fisicos'],
  reparaciones: ['servicios', 'reparaciones'],
  guias:     ['servicios', 'guias'],
  ingresos:  ['admin', 'ingresos'],
  admins:    ['admin', 'admins'],
  genres:    ['catalogo', 'genres'],
};

function ref(key) {
  const [col, docId] = DOCS[key];
  return doc(db, col, docId);
}

// ── Carga un documento; si no existe, lo inicializa con defaultVal ──
export async function fbLoad(key, defaultVal) {
  try {
    const snap = await getDoc(ref(key));
    if (snap.exists()) return snap.data();
    if (defaultVal !== undefined) {
      await setDoc(ref(key), defaultVal);
      return defaultVal;
    }
    return null;
  } catch (e) {
    console.warn('[Firebase] fbLoad error', key, e);
    return defaultVal ?? null;
  }
}

// ── Guarda un documento ──
export async function fbSave(key, data) {
  try {
    await setDoc(ref(key), data);
  } catch (e) {
    console.warn('[Firebase] fbSave error', key, e);
    throw e;
  }
}

// ── Escucha cambios en tiempo real ──
export function fbListen(key, callback) {
  return onSnapshot(ref(key), (snap) => {
    if (snap.exists()) callback(snap.data());
  }, (err) => {
    console.warn('[Firebase] listener error', key, err);
  });
}
