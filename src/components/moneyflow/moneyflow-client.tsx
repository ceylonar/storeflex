

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
import { MoneyflowData, settlePayment, RecentActivity, fetchMoneyflowData, fetchFinancialActivities, MoneyflowTransaction } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FinancialHistory } from './financial-history';
import { FormattedDate } from '../ui/formatted-date';


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
  const [history, setHistory] = React.useState<RecentActivity[]>(initialHistory);
  const [filter, setFilter] = React.useState('all');
  const [isSettling, setIsSettling] = React.useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = React.useState(0);
  const { toast } = useToast();

  const refreshData = async () => {
      const [newData, newHistory] = await Promise.all([
          fetchMoneyflowData(),
          fetchFinancialActivities()
      ]);
      setData(newData);
      setHistory(newHistory);
  };


  const handleSettlePayment = async (transaction: MoneyflowTransaction, status: 'paid' | 'rejected' = 'paid', amount?: number) => {
    setIsSettling(transaction.id);
    try {
      const finalAmount = amount ?? transaction.amount;

      const result = await settlePayment(transaction, status, finalAmount);
      if (result.success) {
        toast({ title: 'Success', description: 'Payment has been settled.' });
        await refreshData();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: (error as Error).message || 'An unexpected error occurred.' });
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
        <StatCard title="Total Receivables" value={`LKR ${data.receivablesTotal.toFixed(2)}`} icon={ArrowDownLeft} description="Money owed to you by customers" />
        <StatCard title="Total Payables" value={`LKR ${data.payablesTotal.toFixed(2)}`} icon={ArrowUpRight} description="Money you owe to suppliers" />
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
                <TableHead>Transaction ID</TableHead>
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
                    <TableCell className="font-mono text-xs">{tx.transactionId}</TableCell>
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
                    <TableCell><FormattedDate timestamp={tx.date} formatString="PPP" /></TableCell>
                    <TableCell className="text-right">
                       {tx.amount > 0 && tx.paymentMethod === 'credit' && (
                         <Dialog onOpenChange={(open) => { if(!open) setSettlementAmount(0) }}>
                            <DialogTrigger asChild>
                               <Button size="sm" disabled={isSettling === tx.id} onClick={() => setSettlementAmount(tx.amount)}>
                                  {isSettling === tx.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                  Settle
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Settle Credit Payment</DialogTitle>
                                <DialogDescription>
                                  Enter the amount being settled for {tx.partyName}. The outstanding amount is LKR {tx.amount.toFixed(2)}.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-2 py-4">
                                <Label htmlFor="settlement-amount">Settlement Amount (LKR)</Label>
                                <Input 
                                  id="settlement-amount"
                                  type="number"
                                  value={settlementAmount}
                                  onChange={(e) => setSettlementAmount(Number(e.target.value))}
                                  max={tx.amount}
                                />
                              </div>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                    <Button onClick={() => handleSettlePayment(tx, 'paid', settlementAmount)} disabled={settlementAmount <= 0 || settlementAmount > tx.amount}>
                                    Confirm Settlement
                                    </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    No pending transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <FinancialHistory history={history} />
    </div>
  );
}
