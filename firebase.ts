// src/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  Firestore,
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging, Messaging } from "firebase/messaging";

// SECURITY NOTE: The Firebase config below is exposed client-side, which is standard for Firebase.
// However, ensure your Firestore security rules are strict to prevent unauthorized access.
// Example rules:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//   }
// }
const firebaseConfig = {
  apiKey: "AIzaSyBObI5V6saq6I6YofD2TVbavRWCHBg0Pqg",
  authDomain: "teacher-attendance-11300.firebaseapp.com",
  projectId: "teacher-attendance-11300",
  storageBucket: "teacher-attendance-11300.appspot.com",
  messagingSenderId: "289899369388",
  appId: "1:289899369388:web:880c6a00d990da08746009",
  measurementId: "G-5ZQV5BLP0P",
};

// Guard the initialization to avoid duplicate app error
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Initialize Firestore with persistent local cache for offline support
export const db: Firestore = (() => {
  if (!getApps().length || !getFirestore()) {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache(),
      });
    } catch (error: any) {
      console.error("Error initializing Firestore:", error);
      // Fallback to getFirestore if initialization fails
      return getFirestore(app);
    }
  }
  return getFirestore(app);
})();

export const storage = getStorage(app);

// Initialize Firebase Cloud Messaging with better error handling
let messaging: Messaging | null = null;
if (typeof window !== "undefined") {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.warn(
      "Firebase Messaging is not supported in this environment or failed to initialize:",
      error
    );
    messaging = null; // Explicitly set to null to ensure downstream code handles this
  }
}

export { messaging };
export default app;
