
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import { getFirebaseServices } from './firebase';
import { collection, query, where, getDocs, limit, setDoc, doc } from 'firebase/firestore';
import { encrypt, getSession } from './session';

export interface User {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'sales';
}


async function initializeHardcodedUsers() {
    const { db } = getFirebaseServices();
    const usersCollection = collection(db, 'users');

    const adminUserRef = doc(db, 'users', '1');
    const salesUserRef = doc(db, 'users', '2');

    try {
        const adminDoc = await getDocs(query(usersCollection, where('username', '==', 'superadmin'), limit(1)));
        if (adminDoc.empty) {
            await setDoc(adminUserRef, { id: '1', name: 'Admin', username: 'superadmin', password: 'storeflexadmin', role: 'admin' });
        }

        const salesDoc = await getDocs(query(usersCollection, where('username', '==', 'sales'), limit(1)));
        if (salesDoc.empty) {
            await setDoc(salesUserRef, { id: '2', name: 'Sales Associate', username: 'sales', password: 'storeflexsales', role: 'sales' });
        }
    } catch (e) {
        console.warn("Could not initialize hardcoded users, likely due to Firestore permissions. This is expected on a secure database.");
    }
}


export async function login(prevState: { error: string | undefined } | null, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
      return { error: 'Username and password are required.'}
  }

  // Hardcoded user check to bypass initial Firestore query
  if (username === 'superadmin' && password === 'storeflexadmin') {
      const user: User = { id: '1', name: 'Admin', username: 'superadmin', role: 'admin' };
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const session = await encrypt({ user, expires })
      cookies().set('session', session, { expires, httpOnly: true })
      redirect('/dashboard');
  }

  if (username === 'sales' && password === 'storeflexsales') {
      const user: User = { id: '2', name: 'Sales Associate', username: 'sales', role: 'sales' };
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const session = await encrypt({ user, expires })
      cookies().set('session', session, { expires, httpOnly: true })
      redirect('/dashboard');
  }

  // If not a hardcoded user, then try to query Firestore. This will only work if rules allow.
  try {
      const { db } = getFirebaseServices();
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, where('username', '==', username), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
          return { error: 'Invalid username or password.' };
      }
      
      const userDoc = querySnapshot.docs[0];
      const user = userDoc.data();

      if (user.password !== password) {
          return { error: 'Invalid username or password.' };
      }

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const sessionUser: User = { id: user.id, name: user.name, username: user.username, role: user.role as 'admin' | 'sales' }
      const session = await encrypt({ user: sessionUser, expires })

      cookies().set('session', session, { expires, httpOnly: true })

      redirect('/dashboard');
  } catch (e) {
      if (e instanceof Error && e.message.includes('permission')) {
           return { error: 'Invalid username or password.' };
      }
      console.error(e);
      return { error: 'An unexpected error occurred.' };
  }
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
  redirect('/login');
}

export async function getUser(): Promise<User | null> {
    const session = await getSession();
    if (session && session.user) {
        return session.user;
    }
    return null;
}
