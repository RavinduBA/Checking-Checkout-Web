import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, convertCurrency } from "@/utils/currency";
import { 
  CreditCard, 
  Download, 
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign
} from "lucide-react";

type AccountDetail = {
  id: string;
  name: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  total_income: number;
  total_expenses: number;
  total_transfers: number;
  transaction_count: number;
  transactions: TransactionWithBalance[];
};

type TransactionWithBalance = {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
  description: string;
  amount: number;
  running_balance: number;
  currency: string;
  note?: string;
};

export default function DetailedBalanceSheet() {
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [baseCurrency, setBaseCurrency] = useState<'LKR' | 'USD'>('LKR');
  const { toast } = useToast();

  useEffect(() => {
    fetchAccountDetails();
  }, [baseCurrency]);

  const fetchAccountDetails = async () => {
    setLoading(true);
    try {
      // Fetch all accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("*")
        .order("name");

      if (accountsError) throw accountsError;

      const accountDetails: AccountDetail[] = [];

      for (const account of accountsData || []) {
        // Fetch all transactions for this account
        const [incomeRes, expenseRes, transfersFromRes, transfersToRes] = await Promise.all([
          supabase
            .from("income")
            .select("id, date, amount, type, note, currency")
            .eq("account_id", account.id)
            .order("date", { ascending: true }),
          supabase
            .from("expenses")
            .select("id, date, amount, main_type, sub_type, note, currency")
            .eq("account_id", account.id)
            .order("date", { ascending: true }),
          supabase
            .from("account_transfers")
            .select("id, created_at, amount, note")
            .eq("from_account_id", account.id)
            .order("created_at", { ascending: true }),
          supabase
            .from("account_transfers")
            .select("id, created_at, amount, conversion_rate, note")
            .eq("to_account_id", account.id)
            .order("created_at", { ascending: true })
        ]);

        // Process transactions and calculate running balances
        const transactions: TransactionWithBalance[] = [];
        let runningBalance = account.initial_balance;
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalTransfers = 0;

        // Combine all transactions and sort by date
        const allTransactions: Array<{
          id: string;
          date: string;
          type: 'income' | 'expense' | 'transfer_in' | 'transfer_out';
          amount: number;
          description: string;
          currency: string;
          note?: string;
        }> = [];

        // Process income
        for (const income of incomeRes.data || []) {
          const convertedAmount = await convertCurrency(
            parseFloat(income.amount.toString()),
            income.currency as any,
            baseCurrency
          );
          allTransactions.push({
            id: income.id,
            date: income.date,
            type: 'income',
            amount: convertedAmount,
            description: `${income.type} Income`,
            currency: baseCurrency,
            note: income.note
          });
          totalIncome += convertedAmount;
        }

        // Process expenses
        for (const expense of expenseRes.data || []) {
          const convertedAmount = await convertCurrency(
            parseFloat(expense.amount.toString()),
            expense.currency as any,
            baseCurrency
          );
          allTransactions.push({
            id: expense.id,
            date: expense.date,
            type: 'expense',
            amount: convertedAmount,
            description: `${expense.main_type} - ${expense.sub_type}`,
            currency: baseCurrency,
            note: expense.note
          });
          totalExpenses += convertedAmount;
        }

        // Process transfers out
        for (const transfer of transfersFromRes.data || []) {
          const amount = parseFloat(transfer.amount.toString());
          allTransactions.push({
            id: transfer.id,
            date: transfer.created_at,
            type: 'transfer_out',
            amount: amount,
            description: `Transfer Out${transfer.note ? ` - ${transfer.note}` : ''}`,
            currency: account.currency,
            note: transfer.note
          });
          totalTransfers -= amount;
        }

        // Process transfers in
        for (const transfer of transfersToRes.data || []) {
          const amount = parseFloat(transfer.amount.toString()) * parseFloat(transfer.conversion_rate.toString());
          allTransactions.push({
            id: transfer.id,
            date: transfer.created_at,
            type: 'transfer_in',
            amount: amount,
            description: `Transfer In${transfer.note ? ` - ${transfer.note}` : ''}`,
            currency: account.currency,
            note: transfer.note
          });
          totalTransfers += amount;
        }

        // Sort by date and calculate running balances
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (const txn of allTransactions) {
          if (txn.type === 'income' || txn.type === 'transfer_in') {
            runningBalance += txn.amount;
          } else {
            runningBalance -= txn.amount;
          }

          transactions.push({
            ...txn,
            running_balance: runningBalance
          });
        }

        // Convert initial balance and totals to base currency
        const convertedInitialBalance = await convertCurrency(
          account.initial_balance,
          account.currency as any,
          baseCurrency
        );

        const convertedCurrentBalance = await convertCurrency(
          runningBalance,
          account.currency as any,
          baseCurrency
        );

        accountDetails.push({
          id: account.id,
          name: account.name,
          currency: account.currency,
          initial_balance: convertedInitialBalance,
          current_balance: convertedCurrentBalance,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          total_transfers: totalTransfers,
          transaction_count: transactions.length,
          transactions: transactions.reverse() // Show most recent first
        });
      }

      setAccounts(accountDetails);
    } catch (error) {
      console.error("Error fetching account details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch account details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'income':
      case 'transfer_in':
        return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'expense':
      case 'transfer_out':
        return <ArrowDownLeft className="h-4 w-4 text-red-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const exportBalanceSheet = () => {
    const csvContent = [
      ['Account', 'Currency', 'Initial Balance', 'Current Balance', 'Total Income', 'Total Expenses', 'Net Transfers', 'Transactions'],
      ...accounts.map(acc => [
        acc.name,
        acc.currency,
        acc.initial_balance,
        acc.current_balance,
        acc.total_income,
        acc.total_expenses,
        acc.total_transfers,
        acc.transaction_count
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading balance sheet data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Detailed Balance Sheet
          </h2>
          <p className="text-muted-foreground">Account balances with transaction history and running balances</p>
        </div>
        <div className="flex gap-2">
          <Select value={baseCurrency} onValueChange={(value: 'LKR' | 'USD') => setBaseCurrency(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LKR">LKR</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportBalanceSheet} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {accounts.map((account) => (
          <Card key={account.id}>
            <Collapsible 
              open={expandedAccounts.has(account.id)}
              onOpenChange={() => toggleAccountExpansion(account.id)}
            >
              <CollapsibleTrigger className="w-full">
                <CardHeader className="hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-left">
                      {expandedAccounts.has(account.id) ? 
                        <ChevronDown className="h-5 w-5" /> : 
                        <ChevronRight className="h-5 w-5" />
                      }
                      <div>
                        <CardTitle className="text-lg">{account.name}</CardTitle>
                        <CardDescription>
                          <Badge variant="outline" className="mr-2">{account.currency}</Badge>
                          {account.transaction_count} transactions
                        </CardDescription>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-right">
                      <div>
                        <p className="text-sm text-muted-foreground">Initial Balance</p>
                        <p className="font-semibold">
                          {formatCurrency(account.initial_balance, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Income</p>
                        <p className="font-semibold text-green-600">
                          +{formatCurrency(account.total_income, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses</p>
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(account.total_expenses, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(account.current_balance, baseCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="mb-4">
                    <h4 className="font-semibold text-lg mb-2">Account Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm text-muted-foreground">Initial Balance:</p>
                        <p className="font-semibold">
                          {formatCurrency(account.initial_balance, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Income:</p>
                        <p className="font-semibold text-green-600">
                          +{formatCurrency(account.total_income, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Expenses:</p>
                        <p className="font-semibold text-red-600">
                          -{formatCurrency(account.total_expenses, baseCurrency)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Current Balance:</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(account.current_balance, baseCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold text-lg mb-3">Transaction History (Sorted by Date)</h4>
                  {account.transactions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No transactions found</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {account.transactions.map((txn) => (
                        <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {getTransactionIcon(txn.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant={
                                  txn.type === 'income' ? 'default' :
                                  txn.type === 'expense' ? 'destructive' :
                                  'secondary'
                                }>
                                  {txn.type.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(txn.date).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="font-medium">{txn.description}</p>
                              {txn.note && (
                                <p className="text-sm text-muted-foreground">{txn.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              txn.type === 'income' || txn.type === 'transfer_in' 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {txn.type === 'income' || txn.type === 'transfer_in' ? '+' : '-'}
                              {formatCurrency(txn.amount, baseCurrency)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Balance: {formatCurrency(txn.running_balance, baseCurrency)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
}