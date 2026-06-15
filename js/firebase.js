// ═══════════════════════════════════════════════
//  EVOLUCIÓN GAMES — Firebase Config
// ═══════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

// Carga GDB desde Firestore y lo deja global
export async function cargarGDB() {
  const snap = await getDoc(doc(db, "catalogo", "juegos"));
  if (snap.exists()) {
    window.GDB = snap.data();
  } else {
    // Primera vez: sube el GDB_DEFAULT que ya tienes en games.js
    await setDoc(doc(db, "catalogo", "juegos"), window.GDB_DEFAULT);
    window.GDB = window.GDB_DEFAULT;
  }
}

// Guarda GDB en Firestore (llámala cuando el admin agrega/edita/elimina)
export async function guardarGDB() {
  await setDoc(doc(db, "catalogo", "juegos"), window.GDB);
}

// Escucha cambios en tiempo real (para clientes/empleados)
export function escucharGDB(callback) {
  return onSnapshot(doc(db, "catalogo", "juegos"), (snap) => {
    if (snap.exists()) {
      window.GDB = snap.data();
      callback();
    }
  });
}
