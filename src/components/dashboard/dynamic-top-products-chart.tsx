
'use client';

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { TopSellingProductsCard } from './dashboard-cards';


const DynamicTopSellingProductsCard = dynamic(
  () => import('./dashboard-cards').then(mod => mod.TopSellingProductsCard),
  { 
    ssr: false,
    loading: () => (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    )
  }
)

export default DynamicTopSellingProductsCard;
