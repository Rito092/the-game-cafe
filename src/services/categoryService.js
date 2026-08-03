import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const ALLOWED_UPDATE_FIELDS = ["name", "order"];

function normalizeName(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (!trimmed) {
    throw new Error("Category name must not be empty.");
  }

  return trimmed;
}

function normalizeOrder(order) {
  if (typeof order !== "number" || !Number.isFinite(order)) {
    throw new Error("Category order must be a finite number.");
  }

  return order;
}

export async function getCategories() {
  const q = query(
    collection(db, "categories"),
    orderBy("order", "asc")
  );

  const snapshot = await getDocs(q);

  console.log("snapshot.size =", snapshot.size);

  snapshot.forEach((doc) => {
    console.log("doc =", doc.id, doc.data());
  });

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function createCategory(data) {
  const name = normalizeName(data?.name);
  const order = normalizeOrder(data?.order);

  const docRef = await addDoc(collection(db, "categories"), {
    name,
    order,
    createdAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    name,
    order,
  };
}

export async function updateCategory(id, data) {
  if (!id) {
    throw new Error("Category id is required.");
  }

  const providedFields = Object.keys(data ?? {});
  const disallowedField = providedFields.find(
    (field) => !ALLOWED_UPDATE_FIELDS.includes(field)
  );

  if (disallowedField) {
    throw new Error(`Field "${disallowedField}" cannot be updated.`);
  }

  const updateFields = {};

  if (Object.prototype.hasOwnProperty.call(data, "name")) {
    updateFields.name = normalizeName(data.name);
  }

  if (Object.prototype.hasOwnProperty.call(data, "order")) {
    updateFields.order = normalizeOrder(data.order);
  }

  if (Object.keys(updateFields).length === 0) {
    throw new Error("No valid fields to update.");
  }

  await updateDoc(doc(db, "categories", id), updateFields);

  return {
    id,
    ...updateFields,
  };
}

export async function deleteCategory(id) {
  const q = query(collection(db, "menu"), where("categoryId", "==", id));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    throw new Error(
      "Cannot delete category: one or more menu items still use this category."
    );
  }

  await deleteDoc(doc(db, "categories", id));
}