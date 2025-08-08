
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProfitCardProps {
  profitToday: number;
  profitThisMonth: number;
  profitThisYear: number;
}

export function ProfitCard({ profitToday, profitThisMonth, profitThisYear }: ProfitCardProps) {
  const [timeFrame, setTimeFrame] = useState<'today' | 'month' | 'year'>('today');

  const profitData = {
    today: { value: profitToday, label: "Today", description: "Revenue - COGS - Expenses (Today)" },
    month: { value: profitThisMonth, label: "This Month", description: "Revenue - COGS - Expenses (This Month)" },
    year: { value: profitThisYear, label: "This Year", description: "Revenue - COGS - Expenses (This Year)" },
  };

  const selectedProfit = profitData[timeFrame];

  return (
    <Card>
        <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
                <div className="flex flex-col">
                    <CardTitle className="text-sm font-medium">Profit</CardTitle>
                    <div className="text-2xl font-bold mt-2">
                        LKR {selectedProfit.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                 <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
                    <Button 
                        size="sm" 
                        variant={timeFrame === 'today' ? 'default' : 'ghost'} 
                        onClick={() => setTimeFrame('today')}
                        className="px-2 h-7"
                    >
                        Day
                    </Button>
                    <Button 
                        size="sm" 
                        variant={timeFrame === 'month' ? 'default' : 'ghost'} 
                        onClick={() => setTimeFrame('month')}
                        className="px-2 h-7"
                    >
                        Month
                    </Button>
                    <Button 
                        size="sm" 
                        variant={timeFrame === 'year' ? 'default' : 'ghost'} 
                        onClick={() => setTimeFrame('year')}
                        className="px-2 h-7"
                    >
                        Year
                    </Button>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-xs text-muted-foreground">{selectedProfit.description}</p>
        </CardContent>
    </Card>
  );
}
