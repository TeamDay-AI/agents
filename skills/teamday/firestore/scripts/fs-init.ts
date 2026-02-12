import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function getDb() {
  if (getApps().length === 0) {
    const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    if (!credJson) {
      console.error("ERROR: GOOGLE_APPLICATION_CREDENTIALS_JSON not set");
      process.exit(1);
    }

    let credential;
    try {
      credential = JSON.parse(credJson);
    } catch {
      console.error(
        "ERROR: GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON"
      );
      process.exit(1);
    }

    initializeApp({
      credential: cert(credential),
      projectId: process.env.FIREBASE_PROJECT_ID || credential.project_id,
    });
  }

  return getFirestore();
}
