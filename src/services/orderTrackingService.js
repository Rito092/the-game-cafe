import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

export function subscribeToSessionOrders(sessionId, callback) {
  if (!sessionId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, "orders"),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const orders = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      callback(orders);
    },
    (error) => {
      console.error("subscribeToSessionOrders error:", error);
      callback([]);
    }
  );

  return unsubscribe;
}