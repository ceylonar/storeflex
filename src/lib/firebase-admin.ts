
import { getApp, getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth, type Auth, type DecodedIdToken } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

export function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApp();
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            return initializeApp({
                credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
            });
        } catch (error) {
            console.error('Error initializing Firebase Admin SDK with service account:', error);
            throw new Error('Firebase Admin SDK initialization failed.');
        }
    }

    // Fallback for environments without a service account key (e.g., App Hosting)
    return initializeApp();
}

export async function verifyIdToken(token: string): Promise<DecodedIdToken> {
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
        // This should not happen for protected routes if middleware is configured correctly.
        return { app: null, auth: { currentUser: null } };
    }

    try {
        const decodedIdToken = await verifyIdToken(sessionCookie);
        const auth = getAuth(getAdminApp());
        
        // Mock the currentUser object for server-side context
        const currentUser = createServerUser(decodedIdToken);
        
        return { app: getAdminApp(), auth: { currentUser } };
    } catch (error) {
        console.error('Error verifying session cookie in getAuthenticatedAppForUser:', error);
        // Do not clear cookie here, middleware will handle it.
        return { app: null, auth: { currentUser: null } };
    }
}
