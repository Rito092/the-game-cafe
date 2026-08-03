import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";

export async function getMenu() {
  const snapshot = await getDocs(collection(db, "menu"));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      categoryId: data.categoryId ?? null,
    };
  });
}

export async function createMenu(data) {
  const docRef = await addDoc(collection(db, "menu"), data);

  return {
    id: docRef.id,
    ...data,
  };
}

export async function updateMenu(id, data) {
  await updateDoc(doc(db, "menu", id), data);

  return {
    id,
    ...data,
  };
}

export async function deleteMenu(id) {
  await deleteDoc(doc(db, "menu", id));
}