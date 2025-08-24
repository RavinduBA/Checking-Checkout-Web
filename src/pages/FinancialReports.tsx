import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ArrowLeft, Filter, CalendarIcon, Download, Eye, Search, MapPin } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type Booking = Tables<"bookings"> & {
  locations?: Location;
};
type Income = Tables<"income"> & {
  locations?: Location;
  accounts?: Account;
};
type Expense = Tables<"expenses"> & {
  locations?: Location;
  accounts?: Account;
};

export default function FinancialReports() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'both';
  
  const [reportType, setReportType] = useState<'income' | 'expense' | 'both'>(initialType as any);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filterMode, setFilterMode] = useState<'date' | 'category' | 'account' | 'location'>('date');
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({
    locationId: 'all',
    accountId: 'all',
    category: '',
    dateFrom: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    dateTo: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    searchText: ''
  });

  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDateDetails, setShowDateDetails] = useState(false);
  
  const { toast } = useToast();

  // Currency conversion rates (should come from settings in real app)
  const conversionRates = {
    USD: 300, // 1 USD = 300 LKR
    EUR: 320, // 1 EUR = 320 LKR  
    LKR: 1    // Base currency
  };

  // Helper function to convert amount to LKR
  const convertToLKR = (amount: number, currency: string) => {
    const rate = conversionRates[currency] || 1;
    return amount * rate;
  };

  // Helper function to format currency in LKR
  const formatLKR = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  useEffect(() => {
    fetchData();
  }, [filters, reportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsData, accountsData, bookingsData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*"),
        supabase.from("bookings").select("*, locations(*)")
          .gte('check_in', filters.dateFrom)
          .lte('check_out', filters.dateTo)
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);
      setBookings(bookingsData.data || []);

      // Build dynamic query conditions
      let incomeQuery = supabase.from("income").select("*, accounts(*), locations(*)");
      let expenseQuery = supabase.from("expenses").select("*, accounts(*), locations(*)");

      // Apply filters
      if (filters.locationId && filters.locationId !== 'all') {
        incomeQuery = incomeQuery.eq('location_id', filters.locationId);
        expenseQuery = expenseQuery.eq('location_id', filters.locationId);
      }
      if (filters.accountId && filters.accountId !== 'all') {
        incomeQuery = incomeQuery.eq('account_id', filters.accountId);
        expenseQuery = expenseQuery.eq('account_id', filters.accountId);
      }
      if (filters.dateFrom) {
        incomeQuery = incomeQuery.gte('date', filters.dateFrom);
        expenseQuery = expenseQuery.gte('date', filters.dateFrom);
      }
      if (filters.dateTo) {
        incomeQuery = incomeQuery.lte('date', filters.dateTo);
        expenseQuery = expenseQuery.lte('date', filters.dateTo);
      }

      const promises = [];
      if (reportType === 'income' || reportType === 'both') {
        promises.push(incomeQuery.order('date', { ascending: false }));
      }
      if (reportType === 'expense' || reportType === 'both') {
        promises.push(expenseQuery.order('date', { ascending: false }));
      }

      const results = await Promise.all(promises);
      
      if (reportType === 'income' || reportType === 'both') {
        const incomeData = reportType === 'both' ? results[0].data : results[0].data;
        setIncomes(incomeData || []);
      }
      if (reportType === 'expense' || reportType === 'both') {
        const expenseData = reportType === 'both' ? results[1].data : results[0].data;
        setExpenses(expenseData || []);
      }
      if (reportType === 'income') {
        setExpenses([]);
      }
      if (reportType === 'expense') {
        setIncomes([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter by search text
  const filteredIncomes = incomes.filter(income => 
    !filters.searchText || 
    income.type.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    income.note?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    income.accounts?.name.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    income.locations?.name.toLowerCase().includes(filters.searchText.toLowerCase())
  );

  const filteredExpenses = expenses.filter(expense => 
    !filters.searchText || 
    expense.main_type.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    expense.sub_type.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    expense.note?.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    expense.accounts?.name.toLowerCase().includes(filters.searchText.toLowerCase()) ||
    expense.locations?.name.toLowerCase().includes(filters.searchText.toLowerCase())
  );

  // Calendar data preparation
  const calendarData: Record<string, { 
    income: number; 
    expense: number; 
    accounts: Set<string>;
    bookings: Array<{ source: string; type: 'checkin' | 'checkout' | 'stay'; guest_name: string; id: string }>;
  }> = {};
  
  filteredIncomes.forEach(income => {
    const date = income.date;
    if (!calendarData[date]) calendarData[date] = { income: 0, expense: 0, accounts: new Set(), bookings: [] };
    const convertedAmount = convertToLKR(parseFloat(income.amount.toString()), income.accounts?.currency || 'LKR');
    calendarData[date].income += convertedAmount;
    if (income.accounts?.name) calendarData[date].accounts.add(income.accounts.name);
  });
  
  filteredExpenses.forEach(expense => {
    const date = expense.date;
    if (!calendarData[date]) calendarData[date] = { income: 0, expense: 0, accounts: new Set(), bookings: [] };
    const convertedAmount = convertToLKR(parseFloat(expense.amount.toString()), expense.accounts?.currency || 'LKR');
    calendarData[date].expense += convertedAmount;
    if (expense.accounts?.name) calendarData[date].accounts.add(expense.accounts.name);
  });

  // Add booking data to calendar - including all stay dates
  bookings.forEach(booking => {
    const checkInDate = new Date(booking.check_in);
    const checkOutDate = new Date(booking.check_out);
    
    // Add booking data for each date in the stay period
    const currentDate = new Date(checkInDate);
    while (currentDate <= checkOutDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      
      if (!calendarData[dateStr]) {
        calendarData[dateStr] = { income: 0, expense: 0, accounts: new Set(), bookings: [] };
      }
      
      // Determine booking type for this specific date
      const isCheckIn = format(currentDate, 'yyyy-MM-dd') === format(checkInDate, 'yyyy-MM-dd');
      const isCheckOut = format(currentDate, 'yyyy-MM-dd') === format(checkOutDate, 'yyyy-MM-dd');
      
      let bookingType: 'checkin' | 'checkout' | 'stay' = 'stay';
      if (isCheckIn) bookingType = 'checkin';
      else if (isCheckOut) bookingType = 'checkout';
      
      calendarData[dateStr].bookings.push({
        source: booking.source,
        type: bookingType,
        guest_name: booking.guest_name,
        id: booking.id
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  });

  // Account color mapping
  const accountColors = {
    0: 'bg-blue-500',
    1: 'bg-green-500', 
    2: 'bg-purple-500',
    3: 'bg-orange-500',
    4: 'bg-pink-500',
    5: 'bg-yellow-500'
  };

  const getAccountColor = (accountName: string) => {
    const index = accounts.findIndex(acc => acc.name === accountName);
    return accountColors[index % 6] || 'bg-gray-500';
  };

  // Booking source color mapping
  const bookingSourceColors = {
    'direct': 'bg-green-500',
    'booking.com': 'bg-blue-500', 
    'airbnb': 'bg-red-500',
    'other': 'bg-purple-500'
  };

  const bookingSourceBgColors = {
    'direct': 'bg-green-200 border-green-300',
    'booking.com': 'bg-blue-200 border-blue-300', 
    'airbnb': 'bg-red-200 border-red-300',
    'other': 'bg-purple-200 border-purple-300'
  };

  const getBookingSourceColor = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('direct')) return bookingSourceColors.direct;
    if (lowerSource.includes('booking')) return bookingSourceColors['booking.com'];
    if (lowerSource.includes('airbnb')) return bookingSourceColors.airbnb;
    return bookingSourceColors.other;
  };

  const getBookingSourceBgColor = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('direct')) return bookingSourceBgColors.direct;
    if (lowerSource.includes('booking')) return bookingSourceBgColors['booking.com'];
    if (lowerSource.includes('airbnb')) return bookingSourceBgColors.airbnb;
    return bookingSourceBgColors.other;
  };


  // Helper function to get dominant booking source for a date
  const getDominantBookingSource = (bookings: any[]) => {
    if (bookings.length === 0) return null;
    
    // Count occurrences of each source
    const sourceCounts = {};
    bookings.forEach(booking => {
      sourceCounts[booking.source] = (sourceCounts[booking.source] || 0) + 1;
    });
    
    // Return the source with highest count
    return Object.keys(sourceCounts).reduce((a, b) => 
      sourceCounts[a] > sourceCounts[b] ? a : b
    );
  };

  // Totals calculation with currency conversion
  const totalIncome = filteredIncomes.reduce((sum, income) => {
    const convertedAmount = convertToLKR(parseFloat(income.amount.toString()), income.accounts?.currency || 'LKR');
    return sum + convertedAmount;
  }, 0);
  
  const totalExpense = filteredExpenses.reduce((sum, expense) => {
    const convertedAmount = convertToLKR(parseFloat(expense.amount.toString()), expense.accounts?.currency || 'LKR');
    return sum + convertedAmount;
  }, 0);
  
  const netAmount = totalIncome - totalExpense;

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading financial reports...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to={reportType === 'income' ? '/income' : reportType === 'expense' ? '/expense' : '/'}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Detailed view of all transactions</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-green-800 font-medium">Total Income</div>
            <div className="text-2xl font-bold text-green-900">{formatLKR(totalIncome)}</div>
            <div className="text-sm text-green-600">{filteredIncomes.length} transactions</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="text-red-800 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">{formatLKR(totalExpense)}</div>
            <div className="text-sm text-red-600">{filteredExpenses.length} transactions</div>
          </CardContent>
        </Card>
        <Card className={cn("bg-gradient-to-br border-2", netAmount >= 0 ? "from-blue-50 to-indigo-50 border-blue-200" : "from-orange-50 to-red-50 border-orange-200")}>
          <CardContent className="p-4">
            <div className={cn("font-medium", netAmount >= 0 ? "text-blue-800" : "text-orange-800")}>Net Amount</div>
            <div className={cn("text-2xl font-bold", netAmount >= 0 ? "text-blue-900" : "text-orange-900")}>
              {formatLKR(Math.abs(netAmount))}
            </div>
            <div className={cn("text-sm", netAmount >= 0 ? "text-blue-600" : "text-orange-600")}>
              {netAmount >= 0 ? "Profit" : "Loss"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={reportType === 'both' ? 'default' : 'outline'}
                onClick={() => setReportType('both')}
                size="sm"
                className="flex-1 sm:flex-none min-w-0"
              >
                Both
              </Button>
              <Button
                variant={reportType === 'income' ? 'default' : 'outline'}
                onClick={() => setReportType('income')}
                size="sm"
                className="flex-1 sm:flex-none min-w-0"
              >
                Income
              </Button>
              <Button
                variant={reportType === 'expense' ? 'default' : 'outline'}
                onClick={() => setReportType('expense')}
                size="sm"
                className="flex-1 sm:flex-none min-w-0"
              >
                Expenses
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <Eye className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">List</span>
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                onClick={() => setViewMode('calendar')}
                size="sm"
                className="flex-1 sm:flex-none"
              >
                <CalendarIcon className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label>Location</Label>
              <Select value={filters.locationId} onValueChange={(value) => setFilters({...filters, locationId: value})}>
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
              <Label>Account</Label>
              <Select value={filters.accountId} onValueChange={(value) => setFilters({...filters, accountId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>
            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, note, account, or location..."
                value={filters.searchText}
                onChange={(e) => setFilters({...filters, searchText: e.target.value})}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'list' ? (
        <Card>
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredIncomes.map(income => ({
                    ...income,
                    transactionType: 'income',
                    category: income.type,
                    color: 'text-green-600'
                  })), ...filteredExpenses.map(expense => ({
                    ...expense,
                    transactionType: 'expense',
                    category: `${expense.main_type} - ${expense.sub_type}`,
                    color: 'text-red-600'
                  }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((transaction, index) => (
                    <TableRow key={`${transaction.transactionType}-${transaction.id}`}>
                      <TableCell>{format(new Date(transaction.date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.transactionType === 'income' ? 'default' : 'destructive'}>
                          {transaction.transactionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell className={transaction.color}>
                        {formatLKR(convertToLKR(parseFloat(transaction.amount.toString()), transaction.accounts?.currency || 'LKR'))}
                      </TableCell>
                      <TableCell>
                        <div className={cn("inline-block w-3 h-3 rounded-full mr-2", getAccountColor(transaction.accounts?.name || ''))}></div>
                        {transaction.accounts?.name} ({transaction.accounts?.currency})
                      </TableCell>
                      <TableCell>{transaction.locations?.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{transaction.note || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {[...filteredIncomes.map(income => ({
                ...income,
                transactionType: 'income',
                category: income.type,
                color: 'text-green-600'
              })), ...filteredExpenses.map(expense => ({
                ...expense,
                transactionType: 'expense',
                category: `${expense.main_type} - ${expense.sub_type}`,
                color: 'text-red-600'
              }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((transaction, index) => (
                <div key={`${transaction.transactionType}-${transaction.id}`} className="p-4 border border-border rounded-lg bg-background">
                  <div className="flex justify-between items-start mb-2">
                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {transaction.category}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), "MMM dd, yyyy")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn("font-bold text-lg", transaction.color)}>
                        {transaction.accounts?.currency === "USD" ? "$" : "Rs."}{transaction.amount.toLocaleString()}
                      </div>
                      <Badge variant={transaction.transactionType === 'income' ? 'default' : 'destructive'} className="text-xs">
                        {transaction.transactionType}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", getAccountColor(transaction.accounts?.name || ''))}></div>
                      <span>{transaction.accounts?.name} ({transaction.accounts?.currency})</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span>{transaction.locations?.name}</span>
                    </div>
                    
                    {transaction.note && (
                      <div className="text-xs italic bg-muted/50 p-2 rounded">
                        "{transaction.note}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredIncomes.length === 0 && filteredExpenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No transactions found for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Calendar View</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Legends */}
            <div className="mb-4 space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Account Colors</h4>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account, index) => (
                    <div key={account.id} className="flex items-center gap-2 text-xs">
                      <div className={cn("w-3 h-3 rounded-full", getAccountColor(account.name))}></div>
                      <span className="text-muted-foreground">{account.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-3 bg-muted/50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Booking Sources</h4>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-muted-foreground">Direct</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-muted-foreground">Booking.com</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-muted-foreground">Airbnb</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-muted-foreground">Other</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Calendar Grid */}
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30 border-b">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const prevMonth = new Date(selectedDate || new Date());
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    setSelectedDate(prevMonth);
                  }}
                >
                  ←
                </Button>
                <h3 className="text-lg font-semibold">
                  {format(selectedDate || new Date(), 'MMMM yyyy')}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const nextMonth = new Date(selectedDate || new Date());
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    setSelectedDate(nextMonth);
                  }}
                >
                  →
                </Button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 bg-muted/20">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="p-2 sm:p-3 text-center font-semibold text-muted-foreground text-xs sm:text-sm border-r border-border last:border-r-0">
                    <span className="hidden sm:inline">{day}</span>
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7">
                {(() => {
                  const currentMonth = selectedDate || new Date();
                  const year = currentMonth.getFullYear();
                  const month = currentMonth.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const firstDayOfMonth = new Date(year, month, 1).getDay();
                  const days = [];

                  // Previous month's trailing days
                  const prevMonth = new Date(year, month, 0);
                  const prevMonthDays = prevMonth.getDate();
                  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
                    const day = prevMonthDays - i;
                    const date = new Date(year, month - 1, day);
                    days.push({ day, date, isCurrentMonth: false });
                  }

                  // Current month days
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(year, month, day);
                    days.push({ day, date, isCurrentMonth: true });
                  }

                  // Next month's leading days
                  const totalCells = Math.ceil(days.length / 7) * 7;
                  let nextMonthDay = 1;
                  while (days.length < totalCells) {
                    const date = new Date(year, month + 1, nextMonthDay);
                    days.push({ day: nextMonthDay, date, isCurrentMonth: false });
                    nextMonthDay++;
                  }

                  return days.map((dayInfo, index) => {
                    const dateStr = format(dayInfo.date, 'yyyy-MM-dd');
                    const data = calendarData[dateStr];
                    const hasData = data && (data.income > 0 || data.expense > 0);
                    const netAmount = hasData ? data.income - data.expense : 0;
                    const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
                    const isToday = isSameDay(dayInfo.date, new Date());
                    
                    // Get booking background color if there are bookings
                    const dominantBookingSource = data ? getDominantBookingSource(data.bookings) : null;
                    const hasBookings = dominantBookingSource !== null;

                    return (
                      <div 
                        key={index}
                        className={cn(
                          "min-h-16 sm:min-h-20 md:min-h-24 lg:min-h-28 p-1 sm:p-2 border-r border-b border-border last:border-r-0 transition-all duration-200 cursor-pointer relative",
                          // Base background
                          dayInfo.isCurrentMonth ? "bg-background hover:bg-muted/30" : "bg-muted/10 hover:bg-muted/20",
                          // Booking source background color
                          dayInfo.isCurrentMonth && hasBookings && getBookingSourceBgColor(dominantBookingSource),
                          // Other states
                          hasData && dayInfo.isCurrentMonth && "shadow-sm",
                          isSelected && "ring-2 ring-primary",
                          isToday && "ring-2 ring-primary ring-inset"
                        )}
                        onClick={() => {
                          if (dayInfo.isCurrentMonth) {
                            setSelectedDate(dayInfo.date);
                            if (hasData) {
                              setShowDateDetails(true);
                            }
                          }
                        }}
                      >
                        <div className="h-full flex flex-col">
                          {/* Day number */}
                          <div className={cn(
                            "text-xs sm:text-sm font-medium mb-1 text-center",
                            !dayInfo.isCurrentMonth && "text-muted-foreground",
                            isSelected && "text-primary font-bold",
                            isToday && "text-primary"
                          )}>
                            {dayInfo.day}
                          </div>

                          {/* Financial data - only show for current month */}
                          {dayInfo.isCurrentMonth && hasData && (
                            <div className="flex-1 space-y-1">
                              {/* Income */}
                              {data.income > 0 && (
                                <div className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-center font-medium border border-green-200">
                                  +{data.income > 999 ? `${(data.income/1000).toFixed(0)}k` : data.income.toLocaleString()}
                                </div>
                              )}
                              
                              {/* Expense */}
                              {data.expense > 0 && (
                                <div className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-center font-medium border border-red-200">
                                  -{data.expense > 999 ? `${(data.expense/1000).toFixed(0)}k` : data.expense.toLocaleString()}
                                </div>
                              )}
                              
                              {/* Net amount */}
                              <div className={cn(
                                "text-xs px-1.5 py-0.5 rounded text-center font-bold border",
                                netAmount >= 0 
                                  ? "bg-blue-100 text-blue-800 border-blue-200" 
                                  : "bg-orange-100 text-orange-800 border-orange-200"
                              )}>
                                {netAmount >= 0 ? '+' : ''}{netAmount > 999 || netAmount < -999 
                                  ? `${(netAmount/1000).toFixed(0)}k` 
                                  : netAmount.toLocaleString()}
                              </div>

                              {/* Account indicators */}
                              <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                                {Array.from(data.accounts).slice(0, 4).map((accountName, idx) => (
                                  <div 
                                    key={idx}
                                    className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border border-white shadow-sm", getAccountColor(accountName as string))}
                                    title={accountName as string}
                                  />
                                ))}
                                {data.accounts.size > 4 && (
                                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-400 border border-white" title={`+${data.accounts.size - 4} more accounts`} />
                                )}
                              </div>

                              {/* Booking indicators */}
                              {data.bookings.length > 0 && (
                                <div className="flex flex-wrap gap-0.5 justify-center mt-1">
                                  {/* Show unique bookings by guest name to avoid duplicates */}
                                  {Array.from(new Set(data.bookings.map(b => b.guest_name)))
                                    .slice(0, 3)
                                    .map((guestName, idx) => {
                                      const booking = data.bookings.find(b => b.guest_name === guestName);
                                      return (
                                        <div 
                                          key={idx}
                                          className={cn(
                                            "w-2 h-2 sm:w-2.5 sm:h-2.5 border border-white shadow-sm",
                                            booking.type === 'checkin' ? 'rounded-full' : 
                                            booking.type === 'checkout' ? 'rounded-sm' : 'rounded',
                                            getBookingSourceColor(booking.source)
                                          )}
                                          title={`${booking.type === 'checkin' ? 'Check-in' : 
                                                   booking.type === 'checkout' ? 'Check-out' : 'Stay'}: ${booking.guest_name} (${booking.source})`}
                                        />
                                      );
                                    })}
                                  {data.bookings.length > 3 && (
                                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-gray-600 border border-white" title={`+${data.bookings.length - 3} more bookings`} />
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Empty state for current month days without data */}
                          {dayInfo.isCurrentMonth && !hasData && (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                              <span className="hidden sm:inline">No data</span>
                              <span className="sm:hidden text-center">-</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            
            {/* Selected Date Details - Simplified */}
            {selectedDate && calendarData[format(selectedDate, 'yyyy-MM-dd')] && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-bold mb-3 text-lg">{format(selectedDate, "MMMM dd, yyyy")}</h3>
                
                {/* Main Total Display */}
                <div className="mb-4">
                  {(() => {
                    const data = calendarData[format(selectedDate, 'yyyy-MM-dd')];
                    const hasIncome = data.income > 0;
                    const hasExpense = data.expense > 0;
                    const netAmount = data.income - data.expense;
                    
                    if (hasIncome && hasExpense) {
                      return (
                        <div 
                          className="p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                          onClick={() => setShowDateDetails(true)}
                        >
                            <div className="flex justify-between items-center">
                              <span className="text-blue-800 font-medium">Net Amount:</span>
                              <span className={cn("font-bold text-xl", netAmount >= 0 ? "text-green-900" : "text-red-900")}>
                                {formatLKR(netAmount)}
                              </span>
                            </div>
                          <div className="text-xs text-blue-600 mt-1">Click to see breakdown</div>
                        </div>
                      );
                    } else if (hasIncome) {
                      return (
                        <div 
                          className="p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                          onClick={() => setShowDateDetails(true)}
                        >
                            <div className="flex justify-between items-center">
                              <span className="text-green-800 font-medium">Total Income:</span>
                              <span className="text-green-900 font-bold text-xl">
                                {formatLKR(data.income)}
                              </span>
                            </div>
                          <div className="text-xs text-green-600 mt-1">Click to see breakdown</div>
                        </div>
                      );
                    } else if (hasExpense) {
                      return (
                        <div 
                          className="p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                          onClick={() => setShowDateDetails(true)}
                        >
                            <div className="flex justify-between items-center">
                              <span className="text-red-800 font-medium">Total Expense:</span>
                              <span className="text-red-900 font-bold text-xl">
                                {formatLKR(data.expense)}
                              </span>
                            </div>
                          <div className="text-xs text-red-600 mt-1">Click to see breakdown</div>
                        </div>
                      );
                    }
                  })()}
                </div>
                
                {/* Quick filter button */}
                <div className="pt-3 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setFilters({
                        ...filters,
                        dateFrom: format(selectedDate, 'yyyy-MM-dd'),
                        dateTo: format(selectedDate, 'yyyy-MM-dd')
                      });
                      setViewMode('list');
                    }}
                    className="w-full sm:w-auto"
                  >
                    View Day's Transactions
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Date Details Dialog */}
      <Dialog open={showDateDetails} onOpenChange={setShowDateDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Transaction Details - {selectedDate && format(selectedDate, "EEEE, MMMM dd, yyyy")}
            </DialogTitle>
            <DialogDescription>
              Complete breakdown of all transactions for this date
            </DialogDescription>
          </DialogHeader>
          
          {selectedDate && (() => {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const dayIncomes = filteredIncomes.filter(income => income.date === dateStr);
            const dayExpenses = filteredExpenses.filter(expense => expense.date === dateStr);
            const dayData = calendarData[dateStr];
            const netAmount = (dayData?.income || 0) - (dayData?.expense || 0);
            
            // Group by accounts for better visualization
            const accountBreakdown = {};
            
            dayIncomes.forEach(income => {
              const accountName = income.accounts?.name || 'Unknown';
              if (!accountBreakdown[accountName]) {
                accountBreakdown[accountName] = { income: 0, expense: 0, currency: 'LKR', color: getAccountColor(accountName) };
              }
              const convertedAmount = convertToLKR(parseFloat(income.amount.toString()), income.accounts?.currency || 'LKR');
              accountBreakdown[accountName].income += convertedAmount;
            });
            
            dayExpenses.forEach(expense => {
              const accountName = expense.accounts?.name || 'Unknown';
              if (!accountBreakdown[accountName]) {
                accountBreakdown[accountName] = { income: 0, expense: 0, currency: 'LKR', color: getAccountColor(accountName) };
              }
              const convertedAmount = convertToLKR(parseFloat(expense.amount.toString()), expense.accounts?.currency || 'LKR');
              accountBreakdown[accountName].expense += convertedAmount;
            });
            
            return (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-sm text-green-600 font-medium">Total Income</div>
                      <div className="text-2xl font-bold text-green-700">
                        {formatLKR(dayData?.income || 0)}
                      </div>
                      <div className="text-xs text-green-600">{dayIncomes.length} transactions</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                    <CardContent className="p-4 text-center">
                      <div className="text-sm text-red-600 font-medium">Total Expenses</div>
                      <div className="text-2xl font-bold text-red-700">
                        {formatLKR(dayData?.expense || 0)}
                      </div>
                      <div className="text-xs text-red-600">{dayExpenses.length} transactions</div>
                    </CardContent>
                  </Card>
                  <Card className={cn("bg-gradient-to-br col-span-2", netAmount >= 0 ? "from-blue-50 to-indigo-50 border-blue-200" : "from-orange-50 to-red-50 border-orange-200")}>
                    <CardContent className="p-4 text-center">
                      <div className={cn("text-sm font-medium", netAmount >= 0 ? "text-blue-600" : "text-orange-600")}>Net Amount</div>
                      <div className={cn("text-2xl font-bold", netAmount >= 0 ? "text-blue-700" : "text-orange-700")}>
                        {netAmount >= 0 ? '+' : ''}{formatLKR(Math.abs(netAmount))}
                      </div>
                      <div className={cn("text-xs", netAmount >= 0 ? "text-blue-600" : "text-orange-600")}>
                        {netAmount >= 0 ? "Profit" : "Loss"} for the day
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Booking Details */}
                {(() => {
                  const dateStr = format(selectedDate, 'yyyy-MM-dd');
                  const dayBookings = calendarData[dateStr]?.bookings || [];
                  
                  if (dayBookings.length > 0) {
                    return (
                      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Bookings ({dayBookings.length})
                          </h3>
                          <div className="space-y-3">
                            {dayBookings.map((booking, idx) => (
                              <div key={idx} className="bg-white/70 p-3 rounded-lg border border-purple-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "w-3 h-3 border border-white shadow-sm",
                                      booking.type === 'checkin' ? 'rounded-full' : 'rounded-sm',
                                      getBookingSourceColor(booking.source)
                                    )}></div>
                                    <span className="font-medium text-purple-900">{booking.guest_name}</span>
                                  </div>
                                  <Badge variant={booking.type === 'checkin' ? 'default' : 'secondary'}>
                                    {booking.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                  </Badge>
                                </div>
                                <div className="text-sm text-purple-700">
                                  <strong>Source:</strong> {booking.source}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                  return null;
                })()}
                
                {/* Account Breakdown */}
                {Object.keys(accountBreakdown).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                      Account Breakdown
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(accountBreakdown).map(([accountName, data]: [string, any]) => (
                        <Card key={accountName} className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={cn("w-4 h-4 rounded-full", data.color)}></div>
                            <div className="font-semibold">{accountName}</div>
                            <Badge variant="outline" className="text-xs">{data.currency}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {data.income > 0 && (
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="text-xs text-green-600">Income</div>
                                <div className="font-bold text-green-700">+{formatLKR(data.income)}</div>
                              </div>
                            )}
                            {data.expense > 0 && (
                              <div className="bg-red-50 p-3 rounded-lg">
                                <div className="text-xs text-red-600">Expenses</div>
                                <div className="font-bold text-red-700">-{formatLKR(data.expense)}</div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Detailed Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {dayIncomes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg text-green-700 mb-3 flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        Income Transactions ({dayIncomes.length})
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dayIncomes.map((income) => (
                          <Card key={income.id} className="p-4 bg-green-50/50 border-green-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-green-800">{income.type}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                  <span className={cn("inline-block w-3 h-3 rounded-full", getAccountColor(income.accounts?.name || ''))}></span>
                                  <span className="font-medium">{income.accounts?.name}</span>
                                  <span>•</span>
                                  <MapPin className="h-3 w-3" />
                                  <span>{income.locations?.name}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  <Badge variant="outline" className="text-xs">{income.payment_method}</Badge>
                                  {income.is_advance && <Badge variant="secondary" className="ml-1 text-xs">Advance</Badge>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600 text-lg">
                                  +{income.accounts?.currency === "USD" ? "$" : "Rs."}{income.amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {income.note && (
                              <div className="text-sm text-muted-foreground bg-white/50 p-2 rounded mt-2">
                                <strong>Note:</strong> {income.note}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {dayExpenses.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-lg text-red-700 mb-3 flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                        Expense Transactions ({dayExpenses.length})
                      </h4>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {dayExpenses.map((expense) => (
                          <Card key={expense.id} className="p-4 bg-red-50/50 border-red-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-red-800">{expense.main_type}</div>
                                <div className="text-sm text-red-600 font-medium">{expense.sub_type}</div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                  <span className={cn("inline-block w-3 h-3 rounded-full", getAccountColor(expense.accounts?.name || ''))}></span>
                                  <span className="font-medium">{expense.accounts?.name}</span>
                                  <span>•</span>
                                  <MapPin className="h-3 w-3" />
                                  <span>{expense.locations?.name}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-red-600 text-lg">
                                  -{expense.accounts?.currency === "USD" ? "$" : "Rs."}{expense.amount.toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {expense.note && (
                              <div className="text-sm text-muted-foreground bg-white/50 p-2 rounded mt-2">
                                <strong>Note:</strong> {expense.note}
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {dayIncomes.length === 0 && dayExpenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions found for this date.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}