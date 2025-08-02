
import { redirect } from 'next/navigation';

// This page is no longer needed as authentication has been removed.
// Redirecting to the dashboard.
export default function LoginPage() {
    redirect('/dashboard');
}
