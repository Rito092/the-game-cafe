import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export async function createOrder({
  tableNumber,
  sessionId,
  items,
  total,
}) {
  return await addDoc(collection(db, "orders"), {
    tableNumber,
    sessionId,
    items,
    total,
    status: "กำลังทำ",
    createdAt: serverTimestamp(),
  });
}