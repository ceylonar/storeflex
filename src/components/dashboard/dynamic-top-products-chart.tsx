'use client';

import dynamic from 'next/dynamic'

const TopSellingProductsCard = dynamic(
  () => import('./dashboard-cards').then(mod => mod.TopSellingProductsCard),
  { ssr: false }
)

export default TopSellingProductsCard;
