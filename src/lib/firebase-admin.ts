
import { getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { headers } from 'next/headers';

const APPS: Record<string, App> = {};

function getAppForUser(uid: string): App {
  if (APPS[uid]) {
    return APPS[uid];
  }
  const app = initializeApp(
    {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    },
    uid
  );

  APPS[uid] = app;
  return app;
}

export async function getAuthenticatedAppForUser() {
  const GID = headers().get('X-Goog-Authenticated-User-ID');
  const email = headers().get('X-Goog-Authenticated-User-Email');

  if (!GID) {
    throw new Error('User not authenticated.');
  }

  const uid = GID.startsWith('auth-id-') ? GID.substring('auth-id-'.length) : GID;
  const app = getAppForUser(uid);
  const auth = getAuth(app);
  auth.currentUser = {
      uid,
      email: email || undefined,
      emailVerified: false,
      disabled: false,
      metadata: {
        creationTime: new Date().toUTCString(),
        lastSignInTime: new Date().toUTCString(),
      },
      providerData: [],
      toJSON: () => ({}),
  };

  return { app, auth };
}
