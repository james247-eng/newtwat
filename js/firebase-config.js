import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyAUUPlYnAOAzT79hMRvza6jpeI0YmrVKJQ",
  authDomain: "edublinkz-school.firebaseapp.com",
  projectId: "edublinkz-school",
  storageBucket: "edublinkz-school.firebasestorage.app",
  messagingSenderId: "652868370751",
  appId: "1:652868370751:web:057d5721e6fc04c27fd38a",
  measurementId: "G-2HXV5FW483"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

let currentUser = null;

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const appContainer = document.getElementById('app');
  
  if (user) {
    appContainer?.classList.add('authenticated');
    appContainer?.classList.remove('unauthenticated');
  } else {
    appContainer?.classList.add('unauthenticated');
    appContainer?.classList.remove('authenticated');
  }
});

export { auth, db, functions, currentUser };