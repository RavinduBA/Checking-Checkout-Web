import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Eye,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Income = Tables<"income"> & {
  accounts: Tables<"accounts">;
};

type Expense = Tables<"expenses"> & {
  accounts: Tables<"accounts">;
};

type Booking = Tables<"bookings"> & {
  locations: Tables<"locations">;
};

type Account = Tables<"accounts">;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [weeklyIncome, setWeeklyIncome] = useState(0);
  const [weeklyExpenses, setWeeklyExpenses] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        todayIncomeData,
        todayExpensesData,
        weeklyIncomeData,
        weeklyExpensesData,
        accountsData,
        bookingsData
      ] = await Promise.all([
        supabase.from("income").select("amount").eq("date", today),
        supabase.from("expenses").select("amount").eq("date", today),
        supabase.from("income").select("amount").gte("date", weekAgo),
        supabase.from("expenses").select("amount").gte("date", weekAgo),
        supabase.from("accounts").select("*"),
        supabase.from("bookings").select("*, locations(*)").gte("check_in", today).order("check_in").limit(5)
      ]);

      setTodayIncome(todayIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setTodayExpenses(todayExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setWeeklyIncome(weeklyIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setWeeklyExpenses(weeklyExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setAccounts(accountsData.data || []);
      setUpcomingBookings(bookingsData.data || []);

      // Calculate account balances
      await calculateAccountBalances(accountsData.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAccountBalances = async (accountsList: Account[]) => {
    const balances: Record<string, number> = {};
    
    for (const account of accountsList) {
      let balance = account.initial_balance;
      
      // Add income
      const { data: income } = await supabase
        .from("income")
        .select("amount")
        .eq("account_id", account.id);
      
      // Subtract expenses
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount")
        .eq("account_id", account.id);
      
      // Add incoming transfers
      const { data: incomingTransfers } = await supabase
        .from("account_transfers")
        .select("amount, conversion_rate")
        .eq("to_account_id", account.id);
      
      // Subtract outgoing transfers
      const { data: outgoingTransfers } = await supabase
        .from("account_transfers")
        .select("amount")
        .eq("from_account_id", account.id);
      
      balance += (income || []).reduce((sum, item) => sum + item.amount, 0);
      balance -= (expenses || []).reduce((sum, item) => sum + item.amount, 0);
      balance += (incomingTransfers || []).reduce((sum, item) => sum + (item.amount * item.conversion_rate), 0);
      balance -= (outgoingTransfers || []).reduce((sum, item) => sum + item.amount, 0);
      
      balances[account.id] = balance;
    }
    
    setAccountBalances(balances);
  };

  if (loading) {
    return <div className="space-y-6 animate-fade-in">Loading dashboard...</div>;
  }

  const profit = weeklyIncome - weeklyExpenses;
  const profitPercentage = weeklyIncome > 0 ? ((profit / weeklyIncome) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Financial Management Dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="villa" size="sm">
            <Link to="/income">
              <Plus className="h-4 w-4" />
              Add Income
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/expense">
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Income
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              Rs. {todayIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time data
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Expenses
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              Rs. {todayExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time data
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              Rs. {profit.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitPercentage}% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.map((account, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
              <div>
                <p className="font-medium text-foreground">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.currency} Account</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {account.currency === "USD" ? "$" : "Rs. "}
                  {(accountBalances[account.id] || 0).toLocaleString()}
                </p>
                <Badge variant="outline" className="mt-1">
                  {account.currency}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming Bookings */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Bookings
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar">
              <Eye className="h-4 w-4" />
              View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <div key={booking.id} className="p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{booking.guest_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.check_in).toLocaleDateString()} to {new Date(booking.check_out).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{booking.locations?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {booking.status}
                    </Badge>
                    <Badge variant="outline">
                      {booking.source.replace('_', '.')}
                    </Badge>
                    <span className="font-bold text-success">
                      Rs. {booking.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No upcoming bookings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}