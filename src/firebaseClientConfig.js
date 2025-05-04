// src/firebaseClientConfig.js

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "API_KEY_KLIENTA",
  authDomain: "restauracjaklient.firebaseapp.com",
  projectId: "restauracjaklient",
  storageBucket: "restauracjaklient.appspot.com",
  messagingSenderId: "734821371420",
  appId: "1:734821371420:web:432f557edd15a5fadbd9d9",
};

// Inicjalizacja aplikacji tylko, jeśli nie została jeszcze zainicjalizowana
const clientApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const clientDb = getFirestore(clientApp);

export { clientDb };
