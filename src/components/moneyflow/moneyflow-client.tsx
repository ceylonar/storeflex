
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ArrowDownLeft, ArrowUpRight, Check, CheckCircle, Landmark, Loader2, X, Receipt, CreditCard } from 'lucide-react';
import { MoneyflowData, MoneyflowTransaction, settlePayment, RecentActivity } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { FinancialHistory } from './financial-history';


const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => {
    const Icon = icon;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

interface MoneyflowClientProps {
  initialData: MoneyflowData;
  initialHistory: RecentActivity[];
}

export function MoneyflowClient({ initialData, initialHistory }: MoneyflowClientProps) {
  const [data, setData] = React.useState<MoneyflowData>(initialData);
  const [filter, setFilter] = React.useState('all');
  const [isSettling, setIsSettling] = React.useState<string | null>(null);
  const { toast } = useToast();

  const handleSettlePayment = async (transaction: MoneyflowTransaction, status: 'paid' | 'rejected' = 'paid') => {
    setIsSettling(transaction.id);
    try {
      const result = await settlePayment(transaction, status);
      if (result.success) {
        toast({ title: 'Success', description: 'Payment has been settled.' });
        // Optimistically update UI
        setData(prevData => {
            const newTransactions = prevData.transactions.filter(t => t.id !== transaction.id);
            const newPendingChecksTotal = transaction.paymentMethod === 'check' ? prevData.pendingChecksTotal - transaction.amount : prevData.pendingChecksTotal;
            const newReceivables = transaction.type === 'receivable' ? prevData.receivablesTotal - transaction.amount : prevData.receivablesTotal;
            const newPayables = transaction.type === 'payable' ? prevData.payablesTotal - transaction.amount : prevData.payablesTotal;

            return {
                ...prevData,
                transactions: newTransactions,
                pendingChecksTotal: newPendingChecksTotal,
                receivablesTotal: newReceivables,
                payablesTotal: newPayables,
            };
        });

      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSettling(null);
    }
  };
  
  const filteredTransactions = data.transactions.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'credit') return t.paymentMethod === 'credit';
      if (filter === 'check') return t.paymentMethod === 'check';
      if (filter === 'receivable') return t.type === 'receivable';
      if (filter === 'payable') return t.type === 'payable';
      return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Receivables" value={`LKR ${data.receivablesTotal.toFixed(2)}`} icon={CreditCard} description="Money owed to you by customers" />
        <StatCard title="Total Payables" value={`LKR ${data.payablesTotal.toFixed(2)}`} icon={Receipt} description="Money you owe to suppliers" />
        <StatCard title="Pending Checks" value={`LKR ${data.pendingChecksTotal.toFixed(2)}`} icon={Landmark} description="Value of all uncleared checks" />
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Pending Transactions</CardTitle>
                    <CardDescription>All uncleared checks and credit balances.</CardDescription>
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter transactions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                        <SelectItem value="check">Checks</SelectItem>
                        <SelectItem value="receivable">Receivables</SelectItem>
                        <SelectItem value="payable">Payables</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Party</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        tx.type === 'receivable' ? 'border-green-500 text-green-600' : 'border-destructive text-destructive'
                      )}>
                        <div className="flex items-center gap-2">
                           {tx.type === 'receivable' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            <span className="capitalize">{tx.type}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{tx.partyName}</TableCell>
                    <TableCell className="capitalize">{tx.paymentMethod} {tx.paymentMethod === 'check' && tx.checkNumber && `(#${tx.checkNumber})`}</TableCell>
                    <TableCell>LKR {tx.amount.toFixed(2)}</TableCell>
                    <TableCell>{format(new Date(tx.date), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                       {tx.amount > 0 && tx.paymentMethod === 'credit' && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                               <Button size="sm" disabled={isSettling === tx.id}>
                                  {isSettling === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                  Settle
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Settle Credit Payment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark the credit payment of LKR {tx.amount.toFixed(2)} with {tx.partyName} as settled. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSettlePayment(tx, 'paid')}>
                                  Continue
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      )}
                      {tx.paymentMethod === 'check' && (
                        <div className="flex gap-2 justify-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline" disabled={isSettling === tx.id}>
                                        {isSettling === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                        Accept
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                     <AlertDialogHeader>
                                        <AlertDialogTitle>Accept Check Payment?</AlertDialogTitle>
                                        <AlertDialogDescription>This will mark check #{tx.checkNumber} as cleared and settle the transaction.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleSettlePayment(tx, 'paid')}>Accept</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive" disabled={isSettling === tx.id}>
                                        {isSettling === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                                        Reject
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Reject Check Payment?</AlertDialogTitle>
                                        <AlertDialogDescription>This will mark check #{tx.checkNumber} as rejected/bounced. The balance will need to be settled via other means.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleSettlePayment(tx, 'rejected')} className={cn(buttonVariants({ variant: "destructive" }))}>Reject</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No pending transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <FinancialHistory initialHistory={initialHistory} />
    </div>
  );
}
