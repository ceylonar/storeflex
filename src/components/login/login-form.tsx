
'use client';

import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function LoginForm() {
    const { toast } = useToast();
    useEffect(() => {
        toast({
            title: 'Authentication Removed',
            description: "You no longer need to log in. You can access all features directly."
        })
    }, [toast]);

    return (
        <div className="text-center text-sm text-muted-foreground p-4">
            <p>Login has been disabled.</p>
            <p>All features are now accessible without authentication.</p>
        </div>
    )
}
