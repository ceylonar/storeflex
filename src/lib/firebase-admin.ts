
import admin from 'firebase-admin';

// This is the correct way to initialize the Firebase Admin SDK in a server environment.
// It will automatically use the service account credentials provided in the environment.
function getFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
        const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (serviceAccountEnv) {
            // Production environment (like Vercel)
            const serviceAccount = JSON.parse(serviceAccountEnv);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        } else {
            // Development environment
            admin.initializeApp({
                credential: admin.credential.applicationDefault(),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
        }
        console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
        // We only want to log the error if it's not the "already exists" error.
        if (!/already exists/u.test(error.message)) {
            console.error('Firebase admin initialization error', error.stack);
        }
    }
  }

  return {
    auth: admin.auth(),
    storage: admin.storage(),
    db: admin.firestore(),
  };
}

export { getFirebaseAdmin };
