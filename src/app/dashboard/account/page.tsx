
import { fetchAllUsers, fetchUserProfile } from "@/lib/queries";
import { User, ShieldAlert, Users } from "lucide-react";
import DynamicAccountForm from "@/components/account/dynamic-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "@/components/account/user-management";
import { Separator } from "@/components/ui/separator";

const PermissionDenied = () => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
                <CardTitle>Permission Denied</CardTitle>
                <CardDescription>You do not have permission to access this page.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <p>Please contact your administrator if you believe this is an error.</p>
        </CardContent>
    </Card>
);

export default async function AccountPage() {
  const userProfile = await fetchUserProfile();
  const allUsers = userProfile?.role === 'admin' ? await fetchAllUsers() : [];

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

      {userProfile?.role === 'admin' && (
        <>
          <Separator />
          <div className="space-y-4">
              <div className="flex items-center gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                      <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                      <p className="text-muted-foreground">
                          Create, edit, and manage user accounts and permissions.
                      </p>
                  </div>
              </div>
              <UserManagement initialUsers={allUsers} />
          </div>
        </>
      )}
    </div>
  );
}
