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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RecentActivity } from '@/lib/types';
import { format } from 'date-fns';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


export function ActivityTable({ activities }: { activities: RecentActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Records</CardTitle>
        <CardDescription>
          A complete history of all inventory activities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="hidden sm:table-cell">
                   <Avatar className="h-9 w-9">
                    <AvatarImage src={activity.product_image} alt={activity.product_name} data-ai-hint="product avatar" />
                    <AvatarFallback>
                        {activity.product_name?.charAt(0).toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{activity.product_name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      activity.type === 'sale' && 'border-accent text-accent-foreground',
                      activity.type === 'update' && 'border-blue-500 text-blue-500',
                      activity.type === 'new' && 'border-purple-500 text-purple-500',
                      activity.type === 'delete' && 'border-destructive text-destructive'
                    )}
                  >
                    {activity.type}
                  </Badge>
                </TableCell>
                <TableCell>{activity.details}</TableCell>
                <TableCell className="text-right">
                  {format(new Date(activity.timestamp), 'PPP p')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
