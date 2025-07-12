import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Download, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Income = Tables<"income"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Expense = Tables<"expenses"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Location = Tables<"locations">;
type Account = Tables<"accounts">;

export default function Reports() {
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIncomeSection, setExpandedIncomeSection] = useState<string | null>(null);
  const [expandedExpenseSection, setExpandedExpenseSection] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incomeData, expenseData, locationData, accountData] = await Promise.all([
        supabase.from("income").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setIncome(incomeData.data || []);
      setExpenses(expenseData.data || []);
      setLocations(locationData.data || []);
      setAccounts(accountData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByLocation = (data: any[]) => {
    if (selectedLocation === "all") return data;
    return data.filter(item => item.location_id === selectedLocation);
  };

  const filterByDateRange = (data: any[]) => {
    if (!startDate && !endDate) return data;
    return data.filter(item => {
      const itemDate = new Date(item.date);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return itemDate >= start && itemDate <= end;
    });
  };

  const getFilteredData = (data: any[]) => {
    return filterByDateRange(filterByLocation(data));
  };

  const calculateTotals = (data: any[]) => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    return {
      today: data.filter(item => new Date(item.date).toDateString() === today.toDateString())
        .reduce((sum, item) => sum + Number(item.amount), 0),
      thisMonth: data.filter(item => new Date(item.date) >= thisMonth)
        .reduce((sum, item) => sum + Number(item.amount), 0),
      thisYear: data.filter(item => new Date(item.date) >= thisYear)
        .reduce((sum, item) => sum + Number(item.amount), 0)
    };
  };

  const filteredIncome = getFilteredData(income);
  const filteredExpenses = getFilteredData(expenses);
  
  const incomeTotal = calculateTotals(filteredIncome);
  const expenseTotal = calculateTotals(filteredExpenses);
  
  const profit = {
    today: incomeTotal.today - expenseTotal.today,
    thisMonth: incomeTotal.thisMonth - expenseTotal.thisMonth,
    thisYear: incomeTotal.thisYear - expenseTotal.thisYear
  };

  const groupByType = (data: Income[] | Expense[]) => {
    const grouped: Record<string, any[]> = {};
    data.forEach(item => {
      const key = 'type' in item ? item.type : item.main_type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const groupByLocation = (data: Income[] | Expense[]) => {
    const grouped: Record<string, any[]> = {};
    data.forEach(item => {
      const key = item.locations?.name || 'Unknown';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const formatCurrency = (amount: number, currency: string = "LKR") => {
    if (currency === "USD") {
      return `$${amount.toLocaleString()}`;
    }
    return `Rs. ${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Financial insights and performance tracking</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-card border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex justify-center items-center min-h-64">Loading...</div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-card border-0 shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today Income</p>
                        <p className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(incomeTotal.today)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Month: {formatCurrency(incomeTotal.thisMonth)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-0 shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today Expenses</p>
                        <p className="text-2xl font-bold text-red-600">
                          {formatCurrency(expenseTotal.today)}
                        </p>
                      </div>
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Month: {formatCurrency(expenseTotal.thisMonth)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-card border-0 shadow-elegant">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Today Profit</p>
                        <p className={`text-2xl font-bold ${profit.today >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(profit.today)}
                        </p>
                      </div>
                      <BarChart3 className={`h-8 w-8 ${profit.today >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Month: {formatCurrency(profit.thisMonth)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Income Section */}
              <Card className="bg-gradient-card border-0 shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-emerald-600">Income Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(groupByType(filteredIncome)).map(([type, items]) => (
                    <Collapsible 
                      key={type}
                      open={expandedIncomeSection === type}
                      onOpenChange={() => setExpandedIncomeSection(expandedIncomeSection === type ? null : type)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                          <div className="flex items-center gap-3">
                            {expandedIncomeSection === type ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                            <Badge variant="outline">{items.length} items</Badge>
                          </div>
                          <span className="font-bold text-emerald-600">
                            {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-2">
                        {Object.entries(groupByLocation(items)).map(([location, locationItems]) => (
                          <div key={location} className="border-l-2 border-emerald-200 pl-4">
                            <div className="flex justify-between items-center py-2">
                              <span className="font-medium">{location}</span>
                              <span className="text-emerald-600 font-semibold">
                                {formatCurrency(locationItems.reduce((sum, item) => sum + Number(item.amount), 0))}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {locationItems.slice(0, 3).map((item) => (
                                <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                                  <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                  <span>{formatCurrency(Number(item.amount))}</span>
                                </div>
                              ))}
                              {locationItems.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{locationItems.length - 3} more entries
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>

              {/* Detailed Expense Section */}
              <Card className="bg-gradient-card border-0 shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-red-600">Expense Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(groupByType(filteredExpenses)).map(([type, items]) => (
                    <Collapsible 
                      key={type}
                      open={expandedExpenseSection === type}
                      onOpenChange={() => setExpandedExpenseSection(expandedExpenseSection === type ? null : type)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                          <div className="flex items-center gap-3">
                            {expandedExpenseSection === type ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-semibold capitalize">{type.replace('_', ' ')}</span>
                            <Badge variant="outline">{items.length} items</Badge>
                          </div>
                          <span className="font-bold text-red-600">
                            {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 space-y-2">
                        {Object.entries(groupByLocation(items)).map(([location, locationItems]) => (
                          <div key={location} className="border-l-2 border-red-200 pl-4">
                            <div className="flex justify-between items-center py-2">
                              <span className="font-medium">{location}</span>
                              <span className="text-red-600 font-semibold">
                                {formatCurrency(locationItems.reduce((sum, item) => sum + Number(item.amount), 0))}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {locationItems.slice(0, 3).map((item) => (
                                <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                                  <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                  <span>{formatCurrency(Number(item.amount))}</span>
                                </div>
                              ))}
                              {locationItems.length > 3 && (
                                <div className="text-xs text-muted-foreground">
                                  +{locationItems.length - 3} more entries
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="profit-loss" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-emerald-600 mb-4">Revenue</h3>
                  <div className="space-y-2 pl-4">
                    {Object.entries(groupByType(filteredIncome)).map(([type, items]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')} Income</span>
                        <span>{formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Revenue</span>
                      <span>{formatCurrency(incomeTotal.thisMonth)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-red-600 mb-4">Expenses</h3>
                  <div className="space-y-2 pl-4">
                    {Object.entries(groupByType(filteredExpenses)).map(([type, items]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span>{formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(expenseTotal.thisMonth)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Profit</span>
                    <span className={`${profit.thisMonth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(profit.thisMonth)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>Account Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {accounts.map((account) => (
                  <div key={account.id} className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{account.name}</h3>
                      <Badge variant="outline">{account.currency}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(Number(account.initial_balance), account.currency)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Assets</span>
                    <span>{formatCurrency(accounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}