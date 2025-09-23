import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, convertCurrency } from "@/utils/currency";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Download,
  RefreshCw,
  Calendar
} from "lucide-react";

type FinancialSummary = {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  incomeTransactions: number;
  expenseTransactions: number;
};

type IncomeCategory = {
  type: string;
  amount: number;
  percentage: number;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
    account: string;
    currency: string;
  }>;
};

type ExpenseCategory = {
  type: string;
  subType?: string;
  amount: number;
  percentage: number;
  transactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
    account: string;
    currency: string;
  }>;
};

export default function EnhancedFinancialReports() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    incomeTransactions: 0,
    expenseTransactions: 0
  });
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expandedIncome, setExpandedIncome] = useState<Set<string>>(new Set());
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set());
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<'LKR' | 'USD'>('LKR');
  const { toast } = useToast();

  useEffect(() => {
    fetchLocations();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedLocation, dateFrom, dateTo, baseCurrency]);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFinancialSummary(),
        fetchIncomeBreakdown(),
        fetchExpenseBreakdown()
      ]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialSummary = async () => {
    try {
      // Build queries with filters
      let incomeQuery = supabase.from("income").select("amount, currency");
      let expenseQuery = supabase.from("expenses").select("amount, currency");
      let paymentsQuery = supabase.from("payments").select("amount, currency");

      // Apply location filters
      if (selectedLocation !== "all") {
        incomeQuery = incomeQuery.eq("location_id", selectedLocation);
        expenseQuery = expenseQuery.eq("location_id", selectedLocation);
        // For payments, we need to join with reservations to get location
        paymentsQuery = supabase
          .from("payments")
          .select("amount, currency, reservations!inner(location_id)")
          .eq("reservations.location_id", selectedLocation);
      } else {
        paymentsQuery = supabase
          .from("payments")
          .select("amount, currency, reservations(location_id)");
      }

      // Apply date filters
      if (dateFrom) {
        incomeQuery = incomeQuery.gte("date", dateFrom);
        expenseQuery = expenseQuery.gte("date", dateFrom);
        paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        incomeQuery = incomeQuery.lte("date", dateTo);
        expenseQuery = expenseQuery.lte("date", dateTo);
        paymentsQuery = paymentsQuery.lte("created_at", dateTo);
      }

      const [incomeResult, expenseResult, paymentsResult] = await Promise.all([
        incomeQuery,
        expenseQuery,
        paymentsQuery
      ]);

      let totalIncome = 0;
      let totalExpenses = 0;
      let totalTransactions = 0;

      // Process direct income
      for (const income of incomeResult.data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(income.amount.toString()),
          income.currency as any,
          baseCurrency
        );
        totalIncome += convertedAmount;
        totalTransactions++;
      }

      // Process reservation payments as income
      for (const payment of paymentsResult.data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(payment.amount.toString()),
          payment.currency as any,
          baseCurrency
        );
        totalIncome += convertedAmount;
        totalTransactions++;
      }

      // Process expenses
      for (const expense of expenseResult.data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(expense.amount.toString()),
          expense.currency as any,
          baseCurrency
        );
        totalExpenses += convertedAmount;
      }

      const netProfit = totalIncome - totalExpenses;
      const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      setSummary({
        totalIncome,
        totalExpenses,
        netProfit,
        profitMargin,
        incomeTransactions: totalTransactions,
        expenseTransactions: expenseResult.data?.length || 0
      });
    } catch (error) {
      console.error("Error fetching financial summary:", error);
    }
  };

  const fetchIncomeBreakdown = async () => {
    try {
      // Fetch direct income
      let incomeQuery = supabase
        .from("income")
        .select(`id, date, amount, type, note, currency, accounts(name)`);

      // Fetch reservation payments
      let paymentsQuery = supabase
        .from("payments")
        .select(`
          id, created_at, amount, currency, payment_type, notes,
          accounts(name),
          reservations(guest_name, reservation_number, location_id)
        `);

      // Apply location filters
      if (selectedLocation !== "all") {
        incomeQuery = incomeQuery.eq("location_id", selectedLocation);
        paymentsQuery = supabase
          .from("payments")
          .select(`
            id, created_at, amount, currency, payment_type, notes,
            accounts(name),
            reservations!inner(guest_name, reservation_number, location_id)
          `)
          .eq("reservations.location_id", selectedLocation);
      } else {
        paymentsQuery = supabase
          .from("payments")
          .select(`
            id, created_at, amount, currency, payment_type, notes,
            accounts(name),
            reservations(guest_name, reservation_number, location_id)
          `);
      }

      // Apply date filters  
      if (dateFrom) {
        incomeQuery = incomeQuery.gte("date", dateFrom);
        paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        incomeQuery = incomeQuery.lte("date", dateTo);
        paymentsQuery = paymentsQuery.lte("created_at", dateTo);
      }

      const [incomeResult, paymentsResult] = await Promise.all([
        incomeQuery.order("date", { ascending: false }),
        paymentsQuery.order("created_at", { ascending: false })
      ]);

      if (incomeResult.error) throw incomeResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      const incomeMap = new Map<string, IncomeCategory>();
      let totalIncomeForPercentage = 0;

      // Process direct income
      for (const income of incomeResult.data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(income.amount.toString()),
          income.currency as any,
          baseCurrency
        );
        totalIncomeForPercentage += convertedAmount;

        const type = income.type || 'Direct Income';
        if (!incomeMap.has(type)) {
          incomeMap.set(type, {
            type,
            amount: 0,
            percentage: 0,
            transactions: []
          });
        }

        const category = incomeMap.get(type)!;
        category.amount += convertedAmount;
        category.transactions.push({
          id: income.id,
          date: income.date,
          amount: convertedAmount,
          description: `${type}${income.note ? ` - ${income.note}` : ''}`,
          account: (income as any).accounts?.name || 'Unknown',
          currency: baseCurrency
        });
      }

      // Process reservation payments
      for (const payment of paymentsResult.data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(payment.amount.toString()),
          payment.currency as any,
          baseCurrency
        );
        totalIncomeForPercentage += convertedAmount;

        const type = 'Reservation Payments';
        if (!incomeMap.has(type)) {
          incomeMap.set(type, {
            type,
            amount: 0,
            percentage: 0,
            transactions: []
          });
        }

        const category = incomeMap.get(type)!;
        category.amount += convertedAmount;
        category.transactions.push({
          id: payment.id,
          date: payment.created_at,
          amount: convertedAmount,
          description: `${payment.payment_type} - ${(payment as any).reservations?.guest_name} (${(payment as any).reservations?.reservation_number})${payment.notes ? ` - ${payment.notes}` : ''}`,
          account: (payment as any).accounts?.name || 'Unknown',
          currency: baseCurrency
        });
      }

      // Calculate percentages and sort
      const categories = Array.from(incomeMap.values()).map(cat => ({
        ...cat,
        percentage: totalIncomeForPercentage > 0 ? (cat.amount / totalIncomeForPercentage) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      setIncomeCategories(categories);
    } catch (error) {
      console.error("Error fetching income breakdown:", error);
    }
  };

  const fetchExpenseBreakdown = async () => {
    try {
      let query = supabase
        .from("expenses")
        .select(`
          id, date, amount, main_type, sub_type, note, currency,
          accounts(name)
        `);

      // Apply filters
      if (selectedLocation !== "all") {
        query = query.eq("location_id", selectedLocation);
      }
      if (dateFrom) {
        query = query.gte("date", dateFrom);
      }
      if (dateTo) {
        query = query.lte("date", dateTo);
      }

      const { data, error } = await query.order("date", { ascending: false });
      if (error) throw error;

      // Group by main expense type
      const expenseMap = new Map<string, ExpenseCategory>();
      let totalExpenseForPercentage = 0;

      for (const expense of data || []) {
        const convertedAmount = await convertCurrency(
          parseFloat(expense.amount.toString()),
          expense.currency as any,
          baseCurrency
        );
        totalExpenseForPercentage += convertedAmount;

        const type = expense.main_type || 'Other';
        if (!expenseMap.has(type)) {
          expenseMap.set(type, {
            type,
            amount: 0,
            percentage: 0,
            transactions: []
          });
        }

        const category = expenseMap.get(type)!;
        category.amount += convertedAmount;
        category.transactions.push({
          id: expense.id,
          date: expense.date,
          amount: convertedAmount,
          description: `${expense.main_type} - ${expense.sub_type}${expense.note ? ` (${expense.note})` : ''}`,
          account: (expense as any).accounts?.name || 'Unknown',
          currency: baseCurrency
        });
      }

      // Calculate percentages
      const categories = Array.from(expenseMap.values()).map(cat => ({
        ...cat,
        percentage: totalExpenseForPercentage > 0 ? (cat.amount / totalExpenseForPercentage) * 100 : 0
      })).sort((a, b) => b.amount - a.amount);

      setExpenseCategories(categories);
    } catch (error) {
      console.error("Error fetching expense breakdown:", error);
    }
  };

  const toggleIncomeExpansion = (type: string) => {
    const newExpanded = new Set(expandedIncome);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedIncome(newExpanded);
  };

  const toggleExpenseExpansion = (type: string) => {
    const newExpanded = new Set(expandedExpenses);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedExpenses(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="px-0 sm:px-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Base Currency</Label>
              <Select value={baseCurrency} onValueChange={(value: 'LKR' | 'USD') => setBaseCurrency(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LKR">LKR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_from">Start Date</Label>
              <Input
                id="date_from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date_to">End Date</Label>
              <Input
                id="date_to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchData} className="w-full">
                <RefreshCw className="size-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Income</p>
                <p className="tex-lg sm:text-3xl font-bold text-green-900">
                  {formatCurrency(summary.totalIncome, baseCurrency)}
                </p>
                <p className="text-sm text-green-600">{summary.incomeTransactions} transactions</p>
              </div>
              <TrendingUp className="size-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Total Expenses</p>
                <p className="tex-lg sm:text-3xl font-bold text-red-900">
                  {formatCurrency(summary.totalExpenses, baseCurrency)}
                </p>
                <p className="text-sm text-red-600">{summary.expenseTransactions} transactions</p>
              </div>
              <TrendingDown className="size-5 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={`${summary.netProfit >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  Net Profit
                </p>
                <p className={`tex-lg sm:text-3xl font-bold ${summary.netProfit >= 0 ? 'text-blue-900' : 'text-red-900'}`}>
                  {formatCurrency(summary.netProfit, baseCurrency)}
                </p>
                <p className={`text-sm ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {summary.profitMargin.toFixed(1)}% margin
                </p>
              </div>
              <DollarSign className={`size-5 ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Summary */}
            <Card className="px-0 sm:px-4">
              <CardHeader className="px-2 pb-3">
                <CardTitle className="flex items-start sm:items-center gap-2 text-green-600 text-md sm:text-xl">
                  <TrendingUp className="size-6" />
                  <p>Income Summary</p>
                  <span className="font-bold">
                    {formatCurrency(summary.totalIncome, baseCurrency)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 space-y-3">
                {incomeCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No income data for selected period
                  </p>
                ) : (
                  incomeCategories.map((category) => (
                    <Collapsible
                      key={category.type}
                      open={expandedIncome.has(category.type)}
                      onOpenChange={() => toggleIncomeExpansion(category.type)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedIncome.has(category.type) ?
                              <ChevronDown className="size-4" /> :
                              <ChevronRight className="size-4" />
                            }
                            <div className="text-left">
                              <p className="font-semibold">{category.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {category.percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {formatCurrency(category.amount, baseCurrency)}
                              <ChevronDown className="size-4 inline ml-1" />
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="pl-8 space-y-2">
                          {category.transactions.slice(0, 10).map((txn) => (
                            <div key={txn.id} className="flex flex-col sm:flex-row items-start justify-between sm:items-center text-sm p-2 bg-muted/30 rounded border-l-2 border-l-green-200">
                              <div>
                                <p className="font-medium">{new Date(txn.date).toLocaleDateString()} - {txn.account}</p>
                                <p className="text-muted-foreground truncate w-80">{txn.description}</p>
                              </div>
                              <p className="font-semibold text-green-600">
                                {formatCurrency(txn.amount, baseCurrency)}
                              </p>
                            </div>
                          ))}
                          {category.transactions.length > 10 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              +{category.transactions.length - 10} more transactions
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card className="px-0 sm:px-4">
              <CardHeader className="px-2 pb-3">
                <CardTitle className="flex items-center gap-2 text-red-600 text-md sm:text-xl">
                  <TrendingDown className="size-6" />
                  Expense Summary
                  <span className="ml-auto font-bold">
                    {formatCurrency(summary.totalExpenses, baseCurrency)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 space-y-3">
                {expenseCategories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No expense data for selected period
                  </p>
                ) : (
                  expenseCategories.map((category) => (
                    <Collapsible
                      key={category.type}
                      open={expandedExpenses.has(category.type)}
                      onOpenChange={() => toggleExpenseExpansion(category.type)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedExpenses.has(category.type) ?
                              <ChevronDown className="size-4" /> :
                              <ChevronRight className="size-4" />
                            }
                            <div className="text-left">
                              <p className="font-semibold">{category.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {category.percentage.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {formatCurrency(category.amount, baseCurrency)}
                              <ChevronDown className="size-4 inline ml-1" />
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="pl-8 space-y-2">
                          {category.transactions.slice(0, 10).map((txn) => (
                            <div key={txn.id} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded border-l-2 border-l-red-200">
                              <div>
                                <p className="font-medium">{new Date(txn.date).toLocaleDateString()} - {txn.account}</p>
                                <p className="text-muted-foreground truncate">{txn.description}</p>
                              </div>
                              <p className="font-semibold text-red-600">
                                {formatCurrency(txn.amount, baseCurrency)}
                              </p>
                            </div>
                          ))}
                          {category.transactions.length > 10 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              +{category.transactions.length - 10} more transactions
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="profit-loss">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <CardDescription>
                Detailed profit and loss breakdown for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground py-12">
                  Detailed P&L report coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>
                Account balances and financial position
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center text-muted-foreground py-12">
                  Balance sheet view coming soon...
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}