
import { SettingsForm } from '@/components/settings/settings-form';
import { fetchUserProfile } from '@/lib/queries';
import { Settings } from 'lucide-react';

export default async function SettingsPage() {
  const userProfile = await fetchUserProfile();

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and business settings.
          </p>
        </div>
      </div>
      <SettingsForm userProfile={userProfile} />
    </div>
  );
}
