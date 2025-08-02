
import { fetchUserProfile } from "@/lib/queries";
import { User } from "lucide-react";
import { AccountForm } from "@/components/account/account-form";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function AccountPage() {
  const user = await getUser();
  if (!user || user.role !== 'admin') {
      redirect('/dashboard/sales');
  }

  const userProfile = await fetchUserProfile();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your store profile and branding.
          </p>
        </div>
      </div>
      
      <AccountForm userProfile={userProfile} />
    </div>
  );
}
