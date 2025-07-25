'use client';

import dynamic from 'next/dynamic'
import { Skeleton } from '../ui/skeleton';

const SalesChartCard = dynamic(
  () => import('./dashboard-cards').then(mod => mod.SalesChartCard),
  { 
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }
)

export default SalesChartCard;

    