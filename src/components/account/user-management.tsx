

'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Pencil } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { manageUser, fetchAllUsers } from '@/lib/queries';
import { Badge } from '../ui/badge';

type FormState = 'add' | 'edit';

const initialUserState: Partial<UserProfile> = {
  id: '',
  name: '',
  email: '',
  role: 'sales',
  password: '',
};

interface UserManagementProps {
    initialUsers: UserProfile[];
}

export function UserManagement({ initialUsers }: UserManagementProps) {
  const [users, setUsers] = React.useState(initialUsers);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedUser, setSelectedUser] = React.useState<Partial<UserProfile>>(initialUserState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleOpenDialog = (state: FormState, user?: UserProfile) => {
    setFormState(state);
    setSelectedUser(user || initialUserState);
    setIsDialogOpen(true);
  };

  const refreshUsers = async () => {
      const updatedUsers = await fetchAllUsers();
      setUsers(updatedUsers);
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await manageUser(formData);

    if (result.success) {
        toast({ title: 'Success', description: result.message });
        await refreshUsers();
        setIsDialogOpen(false);
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>A list of all users in your system.</CardDescription>
            </div>
            <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => handleOpenDialog('add')}>
              <PlusCircle className="h-4 w-4" />
              Add User
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell><Badge variant="outline" className="capitalize">{user.role}</Badge></TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenDialog('edit', user)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{formState === 'add' ? 'Add New User' : 'Edit User'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the user account.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                {selectedUser.id && <input type="hidden" name="id" value={selectedUser.id} />}
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={selectedUser.name} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={selectedUser.email} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                     <Select name="role" defaultValue={selectedUser.role}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" placeholder={formState === 'edit' ? 'Leave blank to keep unchanged' : ''} />
                </div>
            </form>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => formRef.current?.requestSubmit()}>Save User</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
