import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function createOrder({
  tableNumber,
  items,
  total,
}) {
  return await addDoc(collection(db, "orders"), {
    tableNumber,
    items,
    total,
    status: "กำลังทำ",
    createdAt: serverTimestamp(),
  });
}