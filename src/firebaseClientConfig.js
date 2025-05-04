// src/firebaseClientConfig.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB8qzBBpnINce9E5tOskGQqkNMHLglO8vs",
  authDomain: "restauracjapracownik.firebaseapp.com",
  projectId: "restauracjapracownik",
  storageBucket: "restauracjapracownik.appspot.com",
  messagingSenderId: "544492857440",
  appId: "1:544492857440:web:c950173dd55d272a2abb05",
};

// Inicjalizacja aplikacji tylko, jeśli nie została jeszcze zainicjalizowana
const clientApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const clientDb = getFirestore(clientApp);

export { clientApp, clientDb };
