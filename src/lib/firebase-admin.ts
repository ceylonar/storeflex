
import { getApp, getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

// This function initializes and returns the Firebase Admin App instance.
// It ensures the app is initialized only once.
function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApp();
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    try {
        const credential = cert(JSON.parse(serviceAccountKey));
        return initializeApp({ credential });
    } catch(e) {
        console.error("Failed to parse Firebase service account key", e);
        throw new Error("Could not initialize Firebase Admin SDK. Check your FIREBASE_SERVICE_ACCOUNT_KEY.");
    }
}

async function verifyIdToken(token: string): Promise<DecodedIdToken> {
    const auth = getAuth(getAdminApp());
    return auth.verifyIdToken(token);
}

// This function creates a "mock" user object that resembles the client-side user
// for use in server-side components and actions, providing a consistent user context.
function createServerUser(decodedToken: DecodedIdToken) {
    return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified || false,
        disabled: false,
        metadata: {
            creationTime: new Date(decodedToken.iat * 1000).toUTCString(),
            lastSignInTime: new Date(decodedToken.auth_time * 1000).toUTCString(),
        },
        providerData: [],
        toJSON: () => ({ ...decodedToken }),
    };
}


export async function getAuthenticatedAppForUser() {
    const sessionCookie = cookies().get('__session')?.value;

    if (!sessionCookie) {
        return { app: null, auth: { currentUser: null } };
    }

    try {
        const decodedIdToken = await verifyIdToken(sessionCookie);
        const auth = getAuth(getAdminApp());
        
        const currentUser = createServerUser(decodedIdToken);
        
        return { app: getAdminApp(), auth: { currentUser } };
    } catch (error) {
        console.error('Error verifying session cookie in getAuthenticatedAppForUser:', error);
        return { app: null, auth: { currentUser: null } };
    }
}
