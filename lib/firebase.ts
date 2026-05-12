import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase (singleton guard)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Force Long Polling for better compatibility with firewalls/ISPs
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Initialize Analytics only in browser (not during SSR)
const analytics = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null
);

console.log("✅ FIREBASE: Connected using Long Polling mode for project:", firebaseConfig.projectId);

export { db, analytics };
