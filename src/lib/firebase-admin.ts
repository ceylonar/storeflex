
import { getApp, getApps, initializeApp, type App, cert } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

// This function initializes and returns the Firebase Admin App instance.
// It ensures the app is initialized only once.
export function getAdminApp(): App {
    // If the app is already initialized, return it.
    if (getApps().length) {
        return getApp();
    }

    // Prepare credentials.
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const credential = serviceAccountKey
        ? cert(JSON.parse(serviceAccountKey))
        : undefined;

    // Initialize the app.
    return initializeApp({ credential });
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
