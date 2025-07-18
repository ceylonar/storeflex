
import { getApp, getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApp();
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        return initializeApp({
            credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
        });
    }

    return initializeApp();
}

export async function verifyIdToken(token: string) {
    const auth = getAuth(getAdminApp());
    return auth.verifyIdToken(token);
}

export async function getAuthenticatedAppForUser() {
    const sessionCookie = cookies().get('__session')?.value;

    if (!sessionCookie) {
        return null;
    }

    try {
        const decodedIdToken = await verifyIdToken(sessionCookie);
        const auth = getAuth(getAdminApp());
        
        // Mock the currentUser object for server-side context
        auth.currentUser = {
            uid: decodedIdToken.uid,
            email: decodedIdToken.email,
            emailVerified: decodedIdToken.email_verified || false,
            disabled: false,
            metadata: {
                creationTime: new Date(decodedIdToken.auth_time * 1000).toUTCString(),
                lastSignInTime: new Date(decodedIdToken.auth_time * 1000).toUTCString(),
            },
            providerData: [],
            toJSON: () => ({}),
        };

        return { app: getAdminApp(), auth };
    } catch (error) {
        console.error('Error verifying session cookie:', error);
        return null;
    }
}
