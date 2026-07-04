import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export async function getMenu() {
  const snapshot = await getDocs(collection(db, "menu"));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}