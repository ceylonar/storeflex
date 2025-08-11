
import 'dotenv/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


// Initialize Firebase
let app: FirebaseApp;
let db: any;

function initializeFirebase() {
    if (!getApps().length) {
        if (firebaseConfig.projectId) {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
        } else {
            console.error("Firebase project ID is not set. Firebase will not be initialized.");
            // @ts-ignore
            app = null;
            // @ts-ignore
            db = null;
        }
    } else {
        app = getApp();
        db = getFirestore(app);
    }
}

// Ensure Firebase is initialized on first load
initializeFirebase();

function getFirebaseServices() {
    if (!app || !db) {
        // This will attempt to re-initialize if it failed on first load.
        initializeFirebase();
        if (!app || !db) {
            throw new Error('Firebase is not initialized. Please check your environment variables in the .env file.');
        }
    }
    return { app, db };
}


export { db, getFirebaseServices };
