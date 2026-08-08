import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";

// หา active session ของโต๊ะ ถ้าไม่มีให้สร้างใหม่
export async function getOrCreateActiveSession(tableNumber) {
  try {
    const q = query(
      collection(db, "tableSessions"),
      where("tableNumber", "==", Number(tableNumber)),
      where("active", "==", true),
      limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    const docRef = await addDoc(collection(db, "tableSessions"), {
      tableNumber: Number(tableNumber),
      active: true,
      createdAt: serverTimestamp(),
      closedAt: null,
    });

    return docRef.id;
  } catch (error) {
    console.error("getOrCreateActiveSession error:", error);
    throw error;
  }
}

// ปิด session ถ้าไม่มี order ค้างสถานะ "กำลังทำ" หรือ "เสร็จแล้ว" แล้ว
export async function closeSessionIfNoActiveOrders(sessionId) {
  if (!sessionId) return;

  try {

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      return;
    }

    await updateDoc(doc(db, "tableSessions", sessionId), {
      active: false,
      closedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("closeSessionIfNoActiveOrders error:", error);
  }
}