
import { fetchUserProfile } from "@/lib/queries";
import { User } from "lucide-react";
import DynamicAccountForm from "@/components/account/dynamic-account-form";

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
      
      <DynamicAccountForm userProfile={userProfile} />
    </div>
  );
}
