
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

function getFirebaseServices() {
    let app: FirebaseApp;

    // Check if all required config values are present
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.error("Firebase project ID or API Key is not set in environment variables. See README.md for setup instructions.");
        throw new Error("Firebase is not configured. Please check your .env file.");
    }

    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    
    const db = getFirestore(app);

    return { app, db };
}


export { getFirebaseServices };
