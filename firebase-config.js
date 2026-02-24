// firebase-config.js

// 1. Firebase SDK gulo (Realtime Database shoho) load kora
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// 2. Apnar Firebase configuration (Realtime Database URL shoho)
const firebaseConfig = {
  apiKey: "AIzaSyCBYvTkVaW2ARhR6Ce5TUJJeyak9ojdWf4",
  authDomain: "my-1st-site-09.firebaseapp.com",
  projectId: "my-1st-site-09",
  storageBucket: "my-1st-site-09.firebasestorage.app",
  messagingSenderId: "716729465081",
  appId: "1:716729465081:web:bef18625e664ac13ba4a28",
  measurementId: "G-7LDJFSLMHP",
  // Realtime Database Link
  databaseURL: "https://my-1st-site-09-default-rtdb.firebaseio.com/"
};

// 3. Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 4. Export kora (Eikhane db ekhon Realtime Database ke bujhachhe)
export const db = getDatabase(app); 
export const auth = getAuth(app);