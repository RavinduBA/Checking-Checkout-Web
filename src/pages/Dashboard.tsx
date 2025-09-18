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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { usePermissions } from "@/hooks/usePermissions";

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
type Location = Tables<"locations">;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [todayIncome, setTodayIncome] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [weeklyIncome, setWeeklyIncome] = useState(0);
  const [weeklyExpenses, setWeeklyExpenses] = useState(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const { hasAnyPermission, hasPermission } = usePermissions();

  useEffect(() => {
    fetchDashboardData();
  }, [selectedLocation, selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      // Set date filters based on selected month
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      let monthStart = "";
      let monthEnd = "";
      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        monthStart = `${year}-${month}-01`;
        const nextMonth = new Date(parseInt(year), parseInt(month), 1);
        monthEnd = nextMonth.toISOString().split('T')[0];
      }

      // Build query filters
      const locationFilter = selectedLocation === "all" ? {} : { location_id: selectedLocation };
      const todayFilter = selectedMonth ? 
        { ...locationFilter, date: { gte: monthStart, lt: monthEnd } } : 
        { ...locationFilter, date: today };
      const weeklyFilter = selectedMonth ? 
        { ...locationFilter, date: { gte: monthStart, lt: monthEnd } } : 
        { ...locationFilter, date: { gte: weekAgo } };

      const [
        todayIncomeData,
        todayExpensesData,
        weeklyIncomeData,
        weeklyExpensesData,
        accountsData,
        bookingsData,
        locationsData
      ] = await Promise.all([
        selectedMonth ? 
          supabase.from("income").select("amount").gte("date", monthStart).lt("date", monthEnd).match(locationFilter) :
          supabase.from("income").select("amount").eq("date", today).match(locationFilter),
        selectedMonth ?
          supabase.from("expenses").select("amount").gte("date", monthStart).lt("date", monthEnd).match(locationFilter) :
          supabase.from("expenses").select("amount").eq("date", today).match(locationFilter),
        selectedMonth ?
          supabase.from("income").select("amount").gte("date", monthStart).lt("date", monthEnd).match(locationFilter) :
          supabase.from("income").select("amount").gte("date", weekAgo).match(locationFilter),
        selectedMonth ?
          supabase.from("expenses").select("amount").gte("date", monthStart).lt("date", monthEnd).match(locationFilter) :
          supabase.from("expenses").select("amount").gte("date", weekAgo).match(locationFilter),
        supabase.from("accounts").select("*"),
        supabase.from("bookings").select("*, locations(*)").gte("check_in", today).match(selectedLocation === "all" ? {} : { location_id: selectedLocation }).order("check_in").limit(5),
        supabase.from("locations").select("*").eq("is_active", true)
      ]);

      setTodayIncome(todayIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setTodayExpenses(todayExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setWeeklyIncome(weeklyIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setWeeklyExpenses(weeklyExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) || 0);
      setAccounts(accountsData.data || []);
      setUpcomingBookings(bookingsData.data || []);
      setLocations(locationsData.data || []);

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
    <div className="space-y-4 lg:space-y-6 animate-fade-in p-4 lg:p-0">
      {/* Header with Filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-foreground">Welcome back!</h1>
            <p className="text-sm lg:text-base text-muted-foreground">Financial Management Dashboard</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {hasAnyPermission("income") && (
              <Button asChild variant="villa" size="sm" className="w-full sm:w-auto">
                <Link to="/app/income">
                  <Plus className="h-4 w-4" />
                  Add Income
                </Link>
              </Button>
            )}
            {hasAnyPermission("expenses") && (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link to="/app/expense">
                  <Plus className="h-4 w-4" />
                  Add Expense
                </Link>
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Location Filter</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="h-9">
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
          <div className="space-y-1">
            <Label className="text-xs">Month Filter</Label>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedMonth ? 'Monthly Income' : 'Today\'s Income'}
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-success">
              Rs. {(selectedMonth ? weeklyIncome : todayIncome).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedLocation === "all" ? "All locations" : locations.find(l => l.id === selectedLocation)?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedMonth ? 'Monthly Expenses' : 'Today\'s Expenses'}
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-destructive">
              Rs. {(selectedMonth ? weeklyExpenses : todayExpenses).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedLocation === "all" ? "All locations" : locations.find(l => l.id === selectedLocation)?.name}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {selectedMonth ? 'Monthly Profit' : 'Weekly Profit'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl lg:text-2xl font-bold text-primary">
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
        <CardContent className="space-y-3 lg:space-y-4">
          {accounts.map((account, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground truncate">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.currency} Account</p>
              </div>
              <div className="text-right ml-4">
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
          {hasAnyPermission("calendar") && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/calendar">
                <Eye className="h-4 w-4" />
                View All
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <div key={booking.id} className="p-3 lg:p-4 rounded-lg bg-background/50 border border-border/50">
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{booking.guest_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.check_in).toLocaleDateString()} to {new Date(booking.check_out).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">{booking.locations?.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge 
                        variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                        className="capitalize text-xs"
                      >
                        {booking.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {booking.source.replace('_', '.')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="font-bold text-success">
                      Rs. {booking.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 lg:py-8">
              <p className="text-muted-foreground">No upcoming bookings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}