import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDVk0xKbUykia3dpmP0PMMxoVExRgPOo-o",
  authDomain: "test-dafb1.firebaseapp.com",
  databaseURL: "https://test-dafb1.firebaseio.com",
  projectId: "test-dafb1",
  storageBucket: "test-dafb1.firebasestorage.app",
  messagingSenderId: "842762232815",
  appId: "1:842762232815:web:a4bcfac346712ef2250c1a"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
