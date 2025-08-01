
'use client';

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginUser } from "@/lib/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

function LoginButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
        </Button>
    );
}

export default function LoginForm() {
  const [state, formAction] = useActionState(loginUser, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="m@example.com"
          required
        />
      </div>
      <div className="grid gap-2">
        <div className="flex items-center">
          <Label htmlFor="password">Password</Label>
          <Link
            href="#"
            className="ml-auto inline-block text-sm underline"
          >
            Forgot your password?
          </Link>
        </div>
        <Input id="password" name="password" type="password" required />
      </div>
      {state?.message && (
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
          </Alert>
      )}
      <LoginButton />
    </form>
  );
}
