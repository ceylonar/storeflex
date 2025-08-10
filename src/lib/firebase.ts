
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDrYXgAMEzFnZF5OG58Nqyn7eDML72XbJE",
  authDomain: "storeflex-litemgg.firebaseapp.com",
  projectId: "storeflex-litemgg",
  storageBucket: "storeflex-litemgg.appspot.com",
  messagingSenderId: "611296689660",
  appId: "1:611296689660:web:ec067ed7c279fc35ee4679"
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
    if (firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
    } else {
        console.error("Firebase project ID is not set. Firebase will not be initialized.");
        // @ts-ignore
        app = null;
    }
} else {
    app = getApp();
}

const db = app ? getFirestore(app) : null;

function getFirebaseServices() {
    if (!app || !db) {
        throw new Error('Firebase is not initialized. Please check your environment variables in the .env file.');
    }
    return { app, db };
}


export { db, getFirebaseServices };
