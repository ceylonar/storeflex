
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCSmSNmAeCTut9VRG19zjdmxKcxRJBHG8o",
  authDomain: "storeflex-5c94c.firebaseapp.com",
  projectId: "storeflex-5c94c",
  storageBucket: "storeflex-5c94c.appspot.com",
  messagingSenderId: "225594380185",
  appId: "1:225594380185:web:3ada66fbc40a2f9990cd08"
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
