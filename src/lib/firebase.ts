import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

if (!firebaseConfig.firestoreDatabaseId) {
  throw new Error("CRITICAL: firestoreDatabaseId is missing in firebase-applet-config.json. Firestore cannot initialize.");
}

// Stable Firestore initialization with options for slow connections and modern persistence caching
export const db: Firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId.trim());

export const auth: Auth = getAuth(app);

// Keep session active with standard local persistence
setPersistence(auth, browserLocalPersistence)
  .catch((err) => console.error("Firebase Auth persistence error:", err));
