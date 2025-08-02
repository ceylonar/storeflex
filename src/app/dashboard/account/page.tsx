
import { fetchUserProfile, fetchAllUsers } from "@/lib/queries";
import { User } from "lucide-react";
import { AccountForm } from "@/components/account/account-form";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/account/user-management";
import { Separator } from "@/components/ui/separator";


export default async function AccountPage() {
  const user = await getUser();
  if (!user || user.role !== 'admin') {
      redirect('/dashboard/sales');
  }

  const userProfile = await fetchUserProfile();
  const allUsers = await fetchAllUsers();
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your store profile, branding, and user accounts.
          </p>
        </div>
      </div>
      
      <AccountForm userProfile={userProfile} />

      <Separator />

      <UserManagement initialUsers={allUsers} />
    </div>
  );
}
