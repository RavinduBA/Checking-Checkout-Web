import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { format, addDays, isWithinInterval, parseISO, differenceInDays } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, FileText, Download, Filter, Search, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';

type Income = Tables<"income"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Expense = Tables<"expenses"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Booking = Tables<"bookings"> & {
  locations: Tables<"locations">;
};

type Location = Tables<"locations">;
type Account = Tables<"accounts">;

export default function FinancialReports() {
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    locationId: 'all',
    accountId: 'all',
    type: 'all',
    startDate: '',
    endDate: '',
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
  }, []);

  const fetchData = async () => {
    try {
      const [incomeData, expenseData, bookingData, locationData, accountData] = await Promise.all([
        supabase.from("income").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*, locations(*)").order("created_at", { ascending: false }),
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setIncome(incomeData.data || []);
      setExpenses(expenseData.data || []);
      setBookings(bookingData.data || []);
      setLocations(locationData.data || []);
      setAccounts(accountData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on current filters
  const getFilteredData = (data: any[], type: 'income' | 'expense' | 'booking') => {
    return data.filter(item => {
      // Location filter
      if (filters.locationId !== 'all' && item.location_id !== filters.locationId) {
        return false;
      }
      
      // Account filter (only for income/expense)
      if (type !== 'booking' && filters.accountId !== 'all' && item.account_id !== filters.accountId) {
        return false;
      }
      
      // Type filter
      if (filters.type !== 'all') {
        if (type === 'income' && filters.type !== 'income') return false;
        if (type === 'expense' && filters.type !== 'expense') return false;
        if (type === 'booking' && filters.type !== 'booking') return false;
      }
      
      // Date filter
      const itemDate = new Date(item.date || item.created_at);
      if (filters.startDate && itemDate < new Date(filters.startDate)) return false;
      if (filters.endDate && itemDate > new Date(filters.endDate)) return false;
      
      // Search filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const searchFields = [
          item.type || '',
          item.main_type || '',
          item.sub_type || '',
          item.note || '',
          item.guest_name || '',
          item.locations?.name || '',
          item.accounts?.name || ''
        ];
        return searchFields.some(field => 
          field.toString().toLowerCase().includes(searchLower)
        );
      }
      
      return true;
    });
  };

  const filteredIncome = getFilteredData(income, 'income');
  const filteredExpenses = getFilteredData(expenses, 'expense');
  const filteredBookings = getFilteredData(bookings, 'booking');

  // Calculate totals in LKR
  const totalIncome = filteredIncome.reduce((sum, item) => {
    const amountInLKR = convertToLKR(item.amount, item.accounts?.currency || 'LKR');
    return sum + amountInLKR;
  }, 0);

  const totalExpenses = filteredExpenses.reduce((sum, item) => {
    const amountInLKR = convertToLKR(item.amount, item.accounts?.currency || 'LKR');
    return sum + amountInLKR;
  }, 0);

  const netProfit = totalIncome - totalExpenses;

  // Generate PDF report
  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Financial Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
    doc.text(`Total Income: ${formatLKR(totalIncome)}`, 20, 60);
    doc.text(`Total Expenses: ${formatLKR(totalExpenses)}`, 20, 80);
    doc.text(`Net Profit: ${formatLKR(netProfit)}`, 20, 100);
    
    let yPos = 120;
    
    // Income details
    doc.text('Income Details:', 20, yPos);
    yPos += 20;
    
    filteredIncome.forEach((item, index) => {
      const amountInLKR = convertToLKR(item.amount, item.accounts?.currency || 'LKR');
      doc.text(`${item.type} - ${formatLKR(amountInLKR)} - ${item.locations?.name}`, 20, yPos);
      yPos += 10;
      
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
    });
    
    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Booking source background colors with higher opacity
  const bookingSourceBgColors = {
    direct: 'rgba(34, 197, 94, 0.4)', // Stronger green
    airbnb: 'rgba(239, 68, 68, 0.4)', // Stronger red  
    booking_com: 'rgba(59, 130, 246, 0.4)', // Stronger blue
    other: 'rgba(156, 163, 175, 0.3)' // Gray
  };

  // Get background color for booking source
  const getBookingSourceBgColor = (source: string) => {
    switch (source) {
      case 'direct':
        return bookingSourceBgColors.direct;
      case 'airbnb':
        return bookingSourceBgColors.airbnb;
      case 'booking_com':
        return bookingSourceBgColors.booking_com;
      default:
        return bookingSourceBgColors.other;
    }
  };

  // Get booking details for a specific date from income records
  const getBookingDetailsForDate = (date: Date) => {
    const bookingIncomes = filteredIncome.filter(income => {
      if (income.type !== 'booking') return false;
      
      // Check if the date falls within the booking period
      // For income records, we need to check if they have booking period data
      // This would need to be added to the income table structure
      // For now, we'll use the income date as a single day booking
      if (!income.date) return false;
      const incomeDate = new Date(income.date);
      if (isNaN(incomeDate.getTime())) return false;
      return incomeDate.toDateString() === date.toDateString();
    });

    return bookingIncomes;
  };

  // Custom day renderer for calendar with booking source colors
  const renderDay = (day: Date) => {
    const bookingDetails = getBookingDetailsForDate(day);
    
    if (bookingDetails.length === 0) {
      return null;
    }

    // Get the dominant booking source for this date
    const bookingSources = bookingDetails.map(income => {
      // Extract booking source from income record
      // This assumes booking source is stored in the income record
      // You may need to adjust based on your actual data structure
      return income.note?.includes('airbnb') ? 'airbnb' : 
             income.note?.includes('booking.com') ? 'booking_com' : 'direct';
    });

    const dominantSource = bookingSources[0] || 'direct';
    const backgroundColor = getBookingSourceBgColor(dominantSource);

    return (
      <div 
        className="w-full h-full flex items-center justify-center relative"
        style={{ backgroundColor }}
      >
        <span>{day.getDate()}</span>
        {bookingDetails.length > 0 && (
          <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary"></div>
        )}
      </div>
    );
  };

  // Get details for selected date
  const getSelectedDateDetails = () => {
    if (!selectedDate) return null;
    
    const bookingDetails = getBookingDetailsForDate(selectedDate);
    const dayIncome = filteredIncome.filter(item => 
      new Date(item.date).toDateString() === selectedDate.toDateString()
    );
    const dayExpenses = filteredExpenses.filter(item => 
      new Date(item.date).toDateString() === selectedDate.toDateString()
    );

    const dayIncomeTotal = dayIncome.reduce((sum, item) => 
      sum + convertToLKR(item.amount, item.accounts?.currency || 'LKR'), 0
    );
    const dayExpenseTotal = dayExpenses.reduce((sum, item) => 
      sum + convertToLKR(item.amount, item.accounts?.currency || 'LKR'), 0
    );

    return {
      bookings: bookingDetails,
      income: dayIncome,
      expenses: dayExpenses,
      totalIncome: dayIncomeTotal,
      totalExpenses: dayExpenseTotal,
      netProfit: dayIncomeTotal - dayExpenseTotal
    };
  };

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
            <p className="text-muted-foreground">Track income, expenses, and bookings</p>
          </div>
        </div>
        <Button onClick={generatePDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatLKR(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredIncome.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatLKR(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatLKR(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <Label>Location</Label>
              <Select value={filters.locationId} onValueChange={(value) => setFilters(prev => ({...prev, locationId: value}))}>
                <SelectTrigger>
                  <SelectValue />
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
              <Select value={filters.accountId} onValueChange={(value) => setFilters(prev => ({...prev, accountId: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({...prev, type: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income Only</SelectItem>
                  <SelectItem value="expense">Expenses Only</SelectItem>
                  <SelectItem value="booking">Bookings Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({...prev, startDate: e.target.value}))}
              />
            </div>

            <div>
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({...prev, endDate: e.target.value}))}
              />
            </div>

            <div>
              <Label>Search</Label>
              <Input
                placeholder="Search transactions..."
                value={filters.searchText}
                onChange={(e) => setFilters(prev => ({...prev, searchText: e.target.value}))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Booking Calendar
            </CardTitle>
            <div className="flex gap-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: bookingSourceBgColors.direct }}></div>
                <span>Direct</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: bookingSourceBgColors.airbnb }}></div>
                <span>Airbnb</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: bookingSourceBgColors.booking_com }}></div>
                <span>Booking.com</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              components={{
                Day: ({ day, ...props }) => (
                  <div className="relative w-full h-full">
                    {renderDay(day.date)}
                  </div>
                )
              }}
            />
          </CardContent>
        </Card>

        {/* Date Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a Date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate && (() => {
              const details = getSelectedDateDetails();
              if (!details) return <p className="text-muted-foreground">No data for this date</p>;
              
              return (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Income</div>
                      <div className="text-lg font-bold text-green-600">{formatLKR(details.totalIncome)}</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-sm text-muted-foreground">Expenses</div>
                      <div className="text-lg font-bold text-red-600">{formatLKR(details.totalExpenses)}</div>
                    </div>
                  </div>

                  {/* Bookings */}
                  {details.bookings.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Booking Income</h4>
                      <div className="space-y-2">
                        {details.bookings.map((booking) => (
                          <div key={booking.id} className="p-2 bg-muted rounded text-sm">
                            <div className="font-medium">{booking.type}</div>
                            <div className="text-muted-foreground">
                              {formatLKR(convertToLKR(booking.amount, booking.accounts?.currency || 'LKR'))} - {booking.locations?.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Income */}
                  {details.income.filter(i => i.type !== 'booking').length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Other Income</h4>
                      <div className="space-y-2">
                        {details.income.filter(i => i.type !== 'booking').map((income) => (
                          <div key={income.id} className="p-2 bg-muted rounded text-sm">
                            <div className="font-medium">{income.type}</div>
                            <div className="text-muted-foreground">
                              {formatLKR(convertToLKR(income.amount, income.accounts?.currency || 'LKR'))} - {income.locations?.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Expenses */}
                  {details.expenses.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Expenses</h4>
                      <div className="space-y-2">
                        {details.expenses.map((expense) => (
                          <div key={expense.id} className="p-2 bg-muted rounded text-sm">
                            <div className="font-medium">{expense.main_type} - {expense.sub_type}</div>
                            <div className="text-muted-foreground">
                              {formatLKR(convertToLKR(expense.amount, expense.accounts?.currency || 'LKR'))} - {expense.locations?.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {details.income.length === 0 && details.expenses.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No transactions for this date</p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Income */}
            <div>
              <h3 className="font-medium text-green-600 mb-2">Income ({filteredIncome.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {filteredIncome.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <div>
                      <div className="font-medium">{item.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.locations?.name} • {format(new Date(item.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100">
                      {formatLKR(convertToLKR(item.amount, item.accounts?.currency || 'LKR'))}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div>
              <h3 className="font-medium text-red-600 mb-2">Expenses ({filteredExpenses.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {filteredExpenses.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                    <div>
                      <div className="font-medium">{item.main_type} - {item.sub_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.locations?.name} • {format(new Date(item.date), "MMM d, yyyy")}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-red-100">
                      {formatLKR(convertToLKR(item.amount, item.accounts?.currency || 'LKR'))}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
