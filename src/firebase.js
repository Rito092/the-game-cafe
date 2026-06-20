import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC3JF5ZqhLPD22uNgygIGnEC6O0uQnmoh0",
  authDomain: "restaurant-system-5759e.firebaseapp.com",
  projectId: "restaurant-system-5759e",
  storageBucket: "restaurant-system-5759e.firebasestorage.app",
  messagingSenderId: "666764964578",
  appId: "1:666764964578:web:9e93a06351c4da6c1964bb",
  measurementId: "G-G9SHT56PMY"
};

// init app
const app = initializeApp(firebaseConfig);

// database export ตัวเดียวพอ
export const db = getFirestore(app);