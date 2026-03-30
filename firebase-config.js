// firebase-config.js

// 1. Firebase SDK imports (COMPAT version for website compatibility)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics-compat.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js";

// 2. Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCBYvTkVaW2ARhR6Ce5TUJJeyak9ojdWf4",
  authDomain: "my-1st-site-09.firebaseapp.com",
  projectId: "my-1st-site-09",
  storageBucket: "my-1st-site-09.firebasestorage.app",
  messagingSenderId: "716729465081",
  appId: "1:716729465081:web:bef18625e664ac13ba4a28",
  measurementId: "G-7LDJFSLMHP"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics sometimes fails on some environments; DB/Auth must still work
try { getAnalytics(app); } catch (_) {}

// 4. Enable offline persistence for better performance
const firestoreDB = getFirestore(app);
try {
  if (firestoreDB.enablePersistence) {
    firestoreDB.enablePersistence()
      .then(() => {
        console.log("✅ Firebase offline persistence enabled");
      })
      .catch((err) => {
        console.warn("⚠️ Firebase offline persistence unavailable:", err);
      });
  }
} catch (err) {
  console.warn("⚠️ Firebase persistence setup failed:", err);
}

// 5. Export Firestore (COMPAT version with collection method)
export const db = firestoreDB;
export const auth = getAuth(app);
export const storage = getStorage(app);

// Export persistence function for use in other modules
export function enableFirebasePersistence() {
  if (db.enablePersistence) {
    return db.enablePersistence();
  }
  return Promise.resolve();
}