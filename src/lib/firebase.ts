import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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
    const requiredConfigKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

    if (missingKeys.length > 0) {
        const errorMessage = `Firebase configuration is missing required environment variables: ${missingKeys.join(', ')}. Please check your .env file and refer to the README.md for setup instructions.`;
        console.error(errorMessage);
        // This will prevent the app from running without proper config, which is safer.
        throw new Error(errorMessage);
    }

    if (!getApps().length) {
        // Pass the complete config object to initializeApp
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }
    
    const auth = getAuth(app);
    const db = getFirestore(app);

    return { app, db, auth };
}

export { getFirebaseServices };
