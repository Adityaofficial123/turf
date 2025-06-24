// Import Firebase SDK modules from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAJKMsOcTgfZNpSUf5LDtfhgIC7pXN2e7M",
  authDomain: "turf-booking-3c284.firebaseapp.com",
  databaseURL: "https://turf-booking-3c284-default-rtdb.firebaseio.com",
  projectId: "turf-booking-3c284",
  storageBucket: "turf-booking-3c284.appspot.com",
  messagingSenderId: "851491824215",
  appId: "1:851491824215:web:6324acf1219d00343bb912"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// ✅ Expose Firebase globally
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAuth = auth;

// Database helpers
window.firebaseRef = ref;
window.firebaseSet = set;
window.firebaseGet = get;
window.firebaseChild = child;
window.firebaseOnValue = onValue;

// ✅ Auth helpers
window.firebaseAuthFunctions = {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
};
