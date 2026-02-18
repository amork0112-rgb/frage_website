import admin from "firebase-admin";

if (!admin.apps.length) {
    console.warn(
      "⚠️ Firebase Admin not initialized: Missing environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)"
    );
  }

export default admin;
