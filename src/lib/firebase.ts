
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDdN7HRmZyl284l_vr0sUs-JwTqNrowr1I",
  authDomain: "storeflex-lite.firebaseapp.com",
  projectId: "storeflex-lite",
  storageBucket: "storeflex-lite.appspot.com",
  messagingSenderId: "1099463811011",
  appId: "1:1099463811011:web:a20b937575eda8dc3ba776"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { db };
