import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_B64;

  if (!encoded) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY_B64 environment variable."
    );
  }

  let serviceAccount;

  try {
    const json = Buffer.from(encoded, "base64").toString("utf8");
    serviceAccount = JSON.parse(json);
  } catch (err) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY_B64 is not valid Base64 JSON."
    );
  }

  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    );
  }

  return serviceAccount;
}

function getAdminApp() {
  const existingApps = getApps();

  if (existingApps.length > 0) {
    return existingApps[0];
  }

  const serviceAccount = loadServiceAccount();

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

const adminApp = getAdminApp();
const adminDb = getFirestore(adminApp);

export { adminDb };