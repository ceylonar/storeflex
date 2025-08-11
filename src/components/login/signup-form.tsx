

'use client';

import { useActionState } from 'react';
import { signup } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormStatus } from 'react-dom';

function SignupButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Create Account
    </Button>
  );
}

export default function SignupForm() {
  const [state, formAction] = useActionState(signup, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="John Doe"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>
       <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          name="password"
          type="password"
          required
        />
      </div>
       <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
        />
      </div>
       <div className="space-y-2">
        <Label htmlFor="signupCode">Sign-Up Code</Label>
        <Input
          id="signupCode"
          name="signupCode"
          type="password"
          required
        />
      </div>


      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sign-up Failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <SignupButton />
    </form>
  );
}
