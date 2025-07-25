
import { AccountForm } from "@/components/account/account-form";
import { fetchUserProfile } from "@/lib/queries";
import { User } from "lucide-react";

export default async function AccountPage() {
  const userProfile = await fetchUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Account</h1>
          <p className="text-muted-foreground">
            Manage your profile and store settings.
          </p>
        </div>
      </div>
      
      <AccountForm userProfile={userProfile} />
    </div>
  );
}
