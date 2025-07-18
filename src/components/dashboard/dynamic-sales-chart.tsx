'use client';

import dynamic from 'next/dynamic'

const SalesChartCard = dynamic(
  () => import('./dashboard-cards').then(mod => mod.SalesChartCard),
  { ssr: false }
)

export default SalesChartCard;
