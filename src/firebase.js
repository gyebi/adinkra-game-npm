// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCr0oEBfeQD3uBJBSn338S96Cel0goZW1M",
  authDomain: "adinkra-memory-game.firebaseapp.com",
  projectId: "adinkra-memory-game",
  storageBucket: "adinkra-memory-game.firebasestorage.app",
  messagingSenderId: "483416822730",
  appId: "1:483416822730:web:21a823854a808f695df533"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
