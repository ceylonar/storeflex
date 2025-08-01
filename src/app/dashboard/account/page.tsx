
import { fetchUserProfile } from "@/lib/queries";
import { User, ShieldAlert } from "lucide-react";
import DynamicAccountForm from "@/components/account/dynamic-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  
  const canAccess = userProfile?.role === 'admin';

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
      
      {canAccess ? (
          <DynamicAccountForm userProfile={userProfile} />
      ) : (
          <PermissionDenied />
      )}
    </div>
  );
}
