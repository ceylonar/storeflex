
'use client';

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton';

const AccountForm = dynamic(
  () => import('./account-form').then(mod => mod.AccountForm),
  { 
    ssr: false,
    loading: () => (
      <div className="space-y-8">
        <div className="space-y-4">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }
)

export default AccountForm;
