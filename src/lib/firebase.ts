import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
  getFirestore, 
  initializeFirestore, 
  enableNetwork, 
  disableNetwork,
  clearIndexedDbPersistence
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

// Use initializeFirestore to enable long-polling which is often required in proxied environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);

// Connectivity Monitoring & Recovery
export const forceReconnect = async () => {
  try {
    await disableNetwork(db);
    await enableNetwork(db);
    console.log("Firestore network reset triggered");
  } catch (err) {
    console.error("Force reconnect failed:", err);
  }
};

// Clear persistence on startup to avoid stale cache/offline issues
clearIndexedDbPersistence(db).catch((err) => console.error("Could not clear persistence:", err));
