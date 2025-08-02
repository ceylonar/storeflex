
import { getCurrentUser } from "@/lib/queries";
import { User } from "lucide-react";
import DynamicAccountForm from "@/components/account/dynamic-account-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountPage() {
  // Since authentication is removed, we can pass a mock user profile.
  const userProfile = await getCurrentUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
          <p className="text-muted-foreground">
            Manage your store details.
          </p>
        </div>
      </div>
      
      {userProfile && <DynamicAccountForm userProfile={userProfile} />}

       <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>User management has been disabled as authentication was removed.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The application is now in a single-user mode. All features are accessible without logging in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
