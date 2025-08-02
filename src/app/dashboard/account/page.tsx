
import { fetchUserProfile } from "@/lib/queries";
import { User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const user = await getUser();
  if (user?.role !== 'admin') {
      redirect('/dashboard/sales'); // Or some other default page for non-admins
  }
  
  const userProfile = await fetchUserProfile();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account.
          </p>
        </div>
      </div>
      
       <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>User management is disabled. This app uses predefined user accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The two predefined accounts are 'superadmin' and 'sales'.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
