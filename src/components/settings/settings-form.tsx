
'use client';

import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function InfoRow({ label, value }: { label: string; value?: string }) {
    return (
        <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-foreground">{value || 'Not provided'}</p>
        </div>
    );
}

export function SettingsForm({ userProfile }: { userProfile: UserProfile | null }) {

    if (!userProfile) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Could not load user profile information.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>This is the identity information you provided during sign-up.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <InfoRow label="Name" value={userProfile.name} />
                    <InfoRow label="Business Name" value={userProfile.businessName} />
                </div>
                <InfoRow label="Address" value={userProfile.address} />
                 <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <InfoRow label="Contact Number" value={userProfile.contactNumber} />
                    <InfoRow label="Email Address" value={userProfile.email} />
                </div>
                 <InfoRow label="Google Sheet URL" value={userProfile.googleSheetUrl} />
            </CardContent>
        </Card>
    );
}
