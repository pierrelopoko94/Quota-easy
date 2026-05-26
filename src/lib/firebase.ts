import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  type Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

if (!firebaseConfig.firestoreDatabaseId) {
  throw new Error("CRITICAL: firestoreDatabaseId is missing in firebase-applet-config.json. Firestore cannot initialize.");
}

// Stable Firestore initialization with options for slow connections
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
}, firebaseConfig.firestoreDatabaseId.trim());

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistence désactivée - plusieurs onglets ouverts');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistence non supportée sur ce navigateur');
  }
});

export const auth: Auth = getAuth(app);

// Keep session active with standard local persistence
setPersistence(auth, browserLocalPersistence)
  .catch((err) => console.error("Firebase Auth persistence error:", err));
