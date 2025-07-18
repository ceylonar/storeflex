
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
if (!firebaseConfig.apiKey) {
    console.warn('Firebase API Key is not set. The app will not connect to Firebase.');
    // We don't initialize if the key is missing.
    // Functions trying to use db or auth will fail.
} else {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

function getFirebaseServices() {
    if (!app || !db || !auth) {
        throw new Error('Firebase is not initialized. Please check your environment variables.');
    }
    return { db, auth };
}


export { db, auth, getFirebaseServices };
