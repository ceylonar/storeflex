
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Loader2, CheckCircle, XCircle, HandCoins, ShoppingCart, DollarSign, Package, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState, useTransition } from 'react';
import { fetchFinancialActivities } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { RecentActivity } from '@/lib/types';


function ActivityTime({ timestamp }: { timestamp: string }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (timestamp && !isNaN(new Date(timestamp).getTime())) {
      try {
        setTimeAgo(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
      } catch (error) {
        console.error("Error formatting date:", error);
        setTimeAgo("Invalid date");
      }
    } else {
        setTimeAgo("A while ago");
    }
  }, [timestamp]);

  return <>{timeAgo || '...'}</>;
}


const activityIcons: Record<RecentActivity['type'], React.ElementType> = {
    sale: ShoppingCart,
    purchase: DollarSign,
    update: Package,
    new: Package,
    delete: Package,
    credit_settled: HandCoins,
    check_cleared: CheckCircle,
    check_rejected: XCircle,
    sale_return: ShoppingCart,
    purchase_return: DollarSign,
    loss: Package,
    order_created: Package,
}


export function RecentActivityCard() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const loadActivities = () => {
      startTransition(async () => {
        try {
            const fetchedActivities = await fetchFinancialActivities({ limit: 5 });
            setActivities(fetchedActivities);
        } catch (error) {
            console.error("Failed to load recent activities", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not fetch recent activities.',
            });
        }
      });
  }

  useEffect(() => {
    loadActivities();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>What's been happening in your store.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={loadActivities} disabled={isPending}>
            <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-8">
        {isPending ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <p>No recent activity to show.</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type] || Package;
            return (
              <div key={activity.id} className="flex items-center gap-4">
                <Avatar className="hidden h-9 w-9 sm:flex">
                  {activity.product_image ? (
                    <AvatarImage src={activity.product_image} alt={activity.product_name || 'Activity'} data-ai-hint="product avatar" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <AvatarFallback>
                    {activity.product_name?.charAt(0).toUpperCase() || (activity.type === 'sale' ? 'S' : 'A')}
                  </AvatarFallback>
                </Avatar>
                <div className="grid gap-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.product_name && <span className="font-semibold">{activity.product_name}</span>}
                    <span className={cn('ml-2 capitalize text-xs font-semibold', 
                      activity.type === 'sale' && 'text-accent-foreground',
                      activity.type === 'update' && 'text-blue-500',
                      activity.type === 'new' && 'text-purple-500',
                      activity.type === 'delete' && 'text-destructive',
                      activity.type === 'purchase' && 'text-green-600 dark:text-green-500',
                      activity.type === 'credit_settled' && 'text-green-600 dark:text-green-500',
                      activity.type === 'check_cleared' && 'text-green-600 dark:text-green-500',
                      activity.type === 'check_rejected' && 'text-destructive',
                    )}>({activity.type.replace(/_/g, ' ')})</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">
                   <ActivityTime timestamp={activity.timestamp} />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  );
}
