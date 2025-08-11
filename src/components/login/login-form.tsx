

'use client';

import { useActionState, useState } from 'react';
import { login, sendPasswordReset } from '@/lib/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormStatus } from 'react-dom';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Login
    </Button>
  );
}

function ForgotPasswordDialog() {
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
      return;
    }
    const result = await sendPasswordReset(email);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setIsOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
              <Button variant="link" className="px-0 font-normal">Forgot password?</Button>
          </DialogTrigger>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Reset Your Password</DialogTitle>
                  <DialogDescription>
                      Enter your email address and we will send you a link to reset your password.
                  </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-4">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input 
                      id="reset-email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="you@example.com"
                  />
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleForgotPassword}>Send Reset Link</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
  );
}


export default function LoginForm() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="admin@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <ForgotPasswordDialog />
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Login Failed</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <LoginButton />
    </form>
  );
}
