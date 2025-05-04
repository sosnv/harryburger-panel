// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Import Firebase Auth
import { getFirestore } from "firebase/firestore"; // Import Firestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB8qzBBpnINce9E5tOskGQqkNMHLglO8vs",
  authDomain: "restauracjapracownik.firebaseapp.com",
  projectId: "restauracjapracownik",
  storageBucket: "restauracjapracownik.appspot.com",
  messagingSenderId: "544492857440",
  appId: "1:544492857440:web:c950173dd55d272a2abb05",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Initialize Firebase Auth
const db = getFirestore(app); // Initialize Firestore (Database)

// Export both auth and db
export { auth, db };
