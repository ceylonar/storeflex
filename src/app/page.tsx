
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginPage from './login/page';

export default async function HomePage() {
  const user = await getUser();
  if (user) {
    redirect('/dashboard');
  } 
  
  return <LoginPage />;
}
