import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { ArrowLeft, Filter, CalendarIcon, Download, Eye, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
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
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [filters, reportType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [locationsData, accountsData] = await Promise.all([
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setLocations(locationsData.data || []);
      setAccounts(accountsData.data || []);

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
  const calendarData: Record<string, { income: number; expense: number; accounts: Set<string> }> = {};
  filteredIncomes.forEach(income => {
    const date = income.date;
    if (!calendarData[date]) calendarData[date] = { income: 0, expense: 0, accounts: new Set() };
    calendarData[date].income += parseFloat(income.amount.toString());
    if (income.accounts?.name) calendarData[date].accounts.add(income.accounts.name);
  });
  filteredExpenses.forEach(expense => {
    const date = expense.date;
    if (!calendarData[date]) calendarData[date] = { income: 0, expense: 0, accounts: new Set() };
    calendarData[date].expense += parseFloat(expense.amount.toString());
    if (expense.accounts?.name) calendarData[date].accounts.add(expense.accounts.name);
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

  // Totals calculation
  const totalIncome = filteredIncomes.reduce((sum, income) => sum + parseFloat(income.amount.toString()), 0);
  const totalExpense = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
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
            <div className="text-2xl font-bold text-green-900">Rs. {totalIncome.toLocaleString()}</div>
            <div className="text-sm text-green-600">{filteredIncomes.length} transactions</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="text-red-800 font-medium">Total Expenses</div>
            <div className="text-2xl font-bold text-red-900">Rs. {totalExpense.toLocaleString()}</div>
            <div className="text-sm text-red-600">{filteredExpenses.length} transactions</div>
          </CardContent>
        </Card>
        <Card className={cn("bg-gradient-to-br border-2", netAmount >= 0 ? "from-blue-50 to-indigo-50 border-blue-200" : "from-orange-50 to-red-50 border-orange-200")}>
          <CardContent className="p-4">
            <div className={cn("font-medium", netAmount >= 0 ? "text-blue-800" : "text-orange-800")}>Net Amount</div>
            <div className={cn("text-2xl font-bold", netAmount >= 0 ? "text-blue-900" : "text-orange-900")}>
              Rs. {Math.abs(netAmount).toLocaleString()}
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
            <div className="overflow-x-auto">
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
                        {transaction.accounts?.currency === "USD" ? "$" : "Rs."}{transaction.amount.toLocaleString()}
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
              {filteredIncomes.length === 0 && filteredExpenses.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No transactions found for the selected filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg sm:text-xl">Calendar View</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {/* Account Legend */}
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
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

            <div className="w-full overflow-x-auto">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border mx-auto"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4 w-full",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm relative p-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 h-8 sm:h-9 w-8 sm:w-9",
                  day: "h-8 sm:h-9 w-8 sm:w-9 p-0 font-normal aria-selected:opacity-100",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "text-muted-foreground opacity-50",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
                components={{
                  Day: ({ day, ...props }) => {
                    const dateStr = format(day.date, 'yyyy-MM-dd');
                    const data = calendarData[dateStr];
                    const hasData = data && (data.income > 0 || data.expense > 0);
                    const netAmount = hasData ? data.income - data.expense : 0;
                    
                    return (
                      <div 
                        className={cn(
                          "relative w-8 sm:w-9 h-8 sm:h-9 text-center cursor-pointer rounded-md hover:bg-accent transition-colors",
                          hasData && "font-semibold border-2",
                          netAmount > 0 && hasData && "border-green-300 bg-green-50",
                          netAmount < 0 && hasData && "border-red-300 bg-red-50",
                          netAmount === 0 && hasData && "border-blue-300 bg-blue-50",
                          isSameDay(day.date, selectedDate || new Date()) && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setSelectedDate(day.date)}
                        {...props}
                      >
                        <div className="text-xs sm:text-sm leading-none mt-1">
                          {day.date.getDate()}
                        </div>
                        {hasData && (
                          <div className="absolute bottom-0 left-0 right-0 space-y-0">
                            {data.income > 0 && (
                              <div className="text-[8px] sm:text-[9px] text-green-700 font-bold leading-none">
                                +{data.income > 999 ? `${(data.income/1000).toFixed(0)}k` : data.income.toFixed(0)}
                              </div>
                            )}
                            {data.expense > 0 && (
                              <div className="text-[8px] sm:text-[9px] text-red-700 font-bold leading-none">
                                -{data.expense > 999 ? `${(data.expense/1000).toFixed(0)}k` : data.expense.toFixed(0)}
                              </div>
                            )}
                            {/* Account color dots */}
                            <div className="flex justify-center gap-0.5 mt-0.5">
                              {Array.from(data.accounts).slice(0, 3).map((accountName, idx) => (
                                <div 
                                  key={idx}
                                  className={cn("w-1 h-1 rounded-full", getAccountColor(accountName as string))}
                                />
                              ))}
                              {data.accounts.size > 3 && (
                                <div className="w-1 h-1 rounded-full bg-gray-400" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }
                }}
              />
            </div>
            
            {/* Selected Date Details */}
            {selectedDate && calendarData[format(selectedDate, 'yyyy-MM-dd')] && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-bold mb-3 text-lg">{format(selectedDate, "MMMM dd, yyyy")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {calendarData[format(selectedDate, 'yyyy-MM-dd')].income > 0 && (
                      <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                        <span className="text-green-800 font-medium">Total Income:</span>
                        <span className="text-green-900 font-bold">
                          Rs. {calendarData[format(selectedDate, 'yyyy-MM-dd')].income.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {calendarData[format(selectedDate, 'yyyy-MM-dd')].expense > 0 && (
                      <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                        <span className="text-red-800 font-medium">Total Expenses:</span>
                        <span className="text-red-900 font-bold">
                          Rs. {calendarData[format(selectedDate, 'yyyy-MM-dd')].expense.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="text-blue-800 font-medium">Net Amount:</span>
                      <span className={cn("font-bold", 
                        calendarData[format(selectedDate, 'yyyy-MM-dd')].income - calendarData[format(selectedDate, 'yyyy-MM-dd')].expense >= 0 
                          ? "text-green-900" : "text-red-900"
                      )}>
                        Rs. {(calendarData[format(selectedDate, 'yyyy-MM-dd')].income - calendarData[format(selectedDate, 'yyyy-MM-dd')].expense).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2 text-muted-foreground">Accounts Involved:</h4>
                    <div className="space-y-1">
                      {Array.from(calendarData[format(selectedDate, 'yyyy-MM-dd')].accounts).map((accountName, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className={cn("w-3 h-3 rounded-full", getAccountColor(accountName as string))}></div>
                          <span>{accountName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Quick filter button */}
                <div className="mt-3 pt-3 border-t border-border">
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
    </div>
  );
}