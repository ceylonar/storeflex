
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app;
if (!getApps().length) {
    if (firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
    } else {
        console.error("Firebase project ID is not set. Firebase will not be initialized.");
    }
} else {
    app = getApp();
}

const db = app ? getFirestore(app) : null;

function getFirebaseServices() {
    if (!app || !db) {
        throw new Error('Firebase is not initialized. Please check your environment variables in the .env file.');
    }
    return { db };
}


export { db, getFirebaseServices };
