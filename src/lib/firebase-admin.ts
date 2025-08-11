import admin from 'firebase-admin';

function getFirebaseAdmin() {
  if (!admin.apps.length) {
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        throw new Error('Firebase Admin credentials are not set in .env. See README.md');
    }

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
    } catch (error: any) {
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
