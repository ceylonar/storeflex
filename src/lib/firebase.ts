
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
    if (!getApps().length) {
        if (firebaseConfig.projectId) {
            app = initializeApp(firebaseConfig);
        } else {
            console.warn("Firebase project ID is not set. Client-side Firebase will not be initialized.");
            throw new Error('Firebase project ID is not configured for the client.');
        }
    } else {
        app = getApp();
    }
    
    const db = getFirestore(app);

    return { app, db };
}


export { getFirebaseServices };
