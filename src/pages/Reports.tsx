import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Download, BarChart3, ChevronDown, ChevronRight, DollarSign, PieChart, FileText } from "lucide-react";
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
import jsPDF from 'jspdf';

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
  const [expandedIncomeSection, setExpandedIncomeSection] = useState<string | null>("all");
  const [expandedExpenseSection, setExpandedExpenseSection] = useState<string | null>("all");
  const [activeTab, setActiveTab] = useState("summary");

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
      const itemDate = new Date(item.date || item.created_at);
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      return itemDate >= start && itemDate <= end;
    });
  };

  const getFilteredData = (data: any[]) => {
    return filterByDateRange(filterByLocation(data));
  };

  const filteredIncome = getFilteredData(income);
  const filteredExpenses = getFilteredData(expenses);

  const groupByMainAndSubType = (expenses: Expense[]) => {
    const grouped: Record<string, Record<string, Expense[]>> = {};
    expenses.forEach(expense => {
      if (!grouped[expense.main_type]) grouped[expense.main_type] = {};
      if (!grouped[expense.main_type][expense.sub_type]) grouped[expense.main_type][expense.sub_type] = [];
      grouped[expense.main_type][expense.sub_type].push(expense);
    });
    return grouped;
  };

  const groupIncomeBySource = (income: Income[]) => {
    const grouped: Record<string, Income[]> = {};
    income.forEach(inc => {
      const source = inc.type.toUpperCase();
      if (!grouped[source]) grouped[source] = [];
      grouped[source].push(inc);
    });
    return grouped;
  };

  const formatCurrency = (amount: number, currency: string = "LKR") => {
    if (currency === "USD") {
      return `$${Math.abs(amount).toLocaleString()}`;
    }
    return `Rs.${Math.abs(amount).toLocaleString()}`;
  };

  const generateAdvancedPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    
    // Professional header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text('FINANCIAL REPORT', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });
    yPos += 5;
    
    const selectedLocationName = selectedLocation === "all" ? "All Locations" : 
      locations.find(loc => loc.id === selectedLocation)?.name || "Unknown Location";
    doc.text(`Location: ${selectedLocationName}`, 105, yPos, { align: 'center' });
    yPos += 15;
    
    // Period information
    const periodText = startDate && endDate ? 
      `Period: ${startDate} to ${endDate}` : "Period: All time";
    doc.text(periodText, 105, yPos, { align: 'center' });
    yPos += 20;

    // Summary section with light box
    const totalIncome = filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    // Executive Summary Box
    doc.setFillColor(240, 240, 240); // Light gray background
    doc.rect(15, yPos - 5, 180, 35, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPos - 5, 180, 35, 'S');
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('EXECUTIVE SUMMARY', 20, yPos + 5);
    yPos += 15;

    // Summary content
    doc.setFontSize(10);
    doc.text('Total Income:', 20, yPos);
    doc.text(`${formatCurrency(totalIncome)}`, 170, yPos, { align: 'right' });
    yPos += 8;
    
    doc.text('Total Expenses:', 20, yPos);
    doc.text(`${formatCurrency(totalExpenses)}`, 170, yPos, { align: 'right' });
    yPos += 8;
    
    doc.setFontSize(12);
    doc.text('Net Profit:', 20, yPos);
    doc.text(`${formatCurrency(netProfit)}`, 170, yPos, { align: 'right' });
    yPos += 25;

    // Income section with light box
    doc.setFillColor(245, 255, 245); // Light green background
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPos - 5, 180, 10, 'S');
    
    doc.setFontSize(14);
    doc.text('INCOME', 20, yPos + 3);
    yPos += 15;

    const groupedIncome = groupIncomeBySource(filteredIncome);
    Object.entries(groupedIncome).forEach(([source, items]) => {
      const sourceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      
      // Source header with light background
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPos - 3, 170, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(20, yPos - 3, 170, 8, 'S');
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`${source}`, 25, yPos + 2);
      doc.text(`${formatCurrency(sourceTotal)}`, 185, yPos + 2, { align: 'right' });
      yPos += 12;

      items.forEach(item => {
        doc.setFontSize(9);
        const date = new Date(item.date).toLocaleDateString();
        const accountName = item.accounts?.name || 'Unknown Account';
        doc.text(`  ${date} - ${accountName}`, 30, yPos);
        doc.text(`${formatCurrency(item.amount)}`, 185, yPos, { align: 'right' });
        yPos += 6;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      yPos += 5;
    });

    yPos += 10;

    // Expenses section with light box
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFillColor(255, 245, 245); // Light red background
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPos - 5, 180, 10, 'S');
    
    doc.setFontSize(14);
    doc.text('EXPENSES', 20, yPos + 3);
    yPos += 15;

    const groupedExpenses = groupByMainAndSubType(filteredExpenses);
    Object.entries(groupedExpenses).forEach(([mainType, subTypes]) => {
      const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + Number(item.amount), 0);
      
      // Main type header with light background
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPos - 3, 170, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(20, yPos - 3, 170, 8, 'S');
      
      doc.setFontSize(11);
      doc.text(`${mainType}`, 25, yPos + 2);
      doc.text(`${formatCurrency(mainTypeTotal)}`, 185, yPos + 2, { align: 'right' });
      yPos += 12;

      Object.entries(subTypes).forEach(([subType, items]) => {
        const subTypeTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
        
        // Sub type with lighter background
        doc.setFillColor(248, 248, 248);
        doc.rect(25, yPos - 2, 165, 7, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.rect(25, yPos - 2, 165, 7, 'S');
        
        doc.setFontSize(10);
        doc.text(`  ${subType}`, 30, yPos + 2);
        doc.text(`${formatCurrency(subTypeTotal)}`, 185, yPos + 2, { align: 'right' });
        yPos += 10;

        items.forEach(item => {
          doc.setFontSize(9);
          const date = new Date(item.date).toLocaleDateString();
          const accountName = item.accounts?.name || 'Unknown Account';
          doc.text(`    ${date} - ${accountName}`, 35, yPos);
          doc.text(`${formatCurrency(item.amount)}`, 185, yPos, { align: 'right' });
          yPos += 6;
          
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
        });
        yPos += 3;
      });
      yPos += 5;
    });
    
    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  const totalIncome = filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const netProfit = totalIncome - totalExpenses;

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
            <div className="space-y-2">
              <Label>Export Options</Label>
              <div className="flex gap-2">
                <Button onClick={generateAdvancedPDF} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-elegant hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredIncome.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-elegant hover-scale">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredExpenses.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-card border-0 shadow-elegant hover-scale ${netProfit >= 0 ? 'border-l-4 border-l-success' : 'border-l-4 border-l-destructive'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className={`h-4 w-4 ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0'}% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different report views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income Summary */}
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                    Income Summary
                  </span>
                  <Badge variant="outline">{formatCurrency(totalIncome)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(groupIncomeBySource(filteredIncome)).map(([source, items]) => {
                    const sourceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
                    const percentage = totalIncome > 0 ? ((sourceTotal / totalIncome) * 100).toFixed(1) : '0';
                    
                    return (
                      <Collapsible key={source} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                          <span className="font-medium">{source}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{percentage}%</Badge>
                            <span className="font-medium">{formatCurrency(sourceTotal)}</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="space-y-2">
                            {items.slice(0, 5).map((item) => (
                              <div key={item.id} className="flex justify-between text-sm">
                                <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                <span>{formatCurrency(item.amount)}</span>
                              </div>
                            ))}
                            {items.length > 5 && (
                              <p className="text-xs text-muted-foreground">
                                +{items.length - 5} more transactions
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Expense Summary */}
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    Expense Summary
                  </span>
                  <Badge variant="outline">{formatCurrency(totalExpenses)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(groupByMainAndSubType(filteredExpenses)).map(([mainType, subTypes]) => {
                    const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + Number(item.amount), 0);
                    const percentage = totalExpenses > 0 ? ((mainTypeTotal / totalExpenses) * 100).toFixed(1) : '0';
                    
                    return (
                      <Collapsible key={mainType} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                          <span className="font-medium">{mainType}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{percentage}%</Badge>
                            <span className="font-medium">{formatCurrency(mainTypeTotal)}</span>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4">
                          <div className="space-y-3">
                            {Object.entries(subTypes).map(([subType, items]) => {
                              const subTypeTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
                              return (
                                <div key={subType} className="border-l-2 border-muted pl-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm">{subType}</span>
                                    <span className="font-medium">{formatCurrency(subTypeTotal)}</span>
                                  </div>
                                  {items.slice(0, 3).map((item) => (
                                    <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                      <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                      <span>{formatCurrency(item.amount)}</span>
                                    </div>
                                  ))}
                                  {items.length > 3 && (
                                    <p className="text-xs text-muted-foreground">
                                      +{items.length - 3} more
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profit & Loss Tab */}
        <TabsContent value="profit-loss" className="space-y-6 mt-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Profit & Loss Statement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Revenue Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center justify-between">
                    Revenue
                    <span className="text-success">{formatCurrency(totalIncome)}</span>
                  </h3>
                  <div className="pl-4 space-y-2">
                    {Object.entries(groupIncomeBySource(filteredIncome)).map(([source, items]) => {
                      const sourceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
                      return (
                        <div key={source} className="flex justify-between py-2 border-b border-muted">
                          <span>{source} Revenue</span>
                          <span>{formatCurrency(sourceTotal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center justify-between">
                    Operating Expenses
                    <span className="text-destructive">({formatCurrency(totalExpenses)})</span>
                  </h3>
                  <div className="pl-4 space-y-2">
                    {Object.entries(groupByMainAndSubType(filteredExpenses)).map(([mainType, subTypes]) => {
                      const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + Number(item.amount), 0);
                      return (
                        <div key={mainType} className="flex justify-between py-2 border-b border-muted">
                          <span>{mainType}</span>
                          <span>({formatCurrency(mainTypeTotal)})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Net Income */}
                <div className="border-t-2 border-primary pt-4">
                  <div className={`flex justify-between text-xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    <span>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                    <span>{formatCurrency(Math.abs(netProfit))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet Tab */}
        <TabsContent value="balance-sheet" className="space-y-6 mt-6">
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Balance Sheet Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Assets */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-success">Assets</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Current Assets</h4>
                      <div className="space-y-2 pl-4">
                        {accounts.map((account) => (
                          <div key={account.id} className="flex justify-between text-sm">
                            <span>{account.name}</span>
                            <span>{formatCurrency(account.initial_balance, account.currency)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold text-success border-t pt-2">
                      <span>Total Assets</span>
                      <span>
                        {formatCurrency(
                          accounts.reduce((sum, acc) => sum + acc.initial_balance, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary">Owner's Equity</h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Retained Earnings</h4>
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-sm">
                          <span>Net Income</span>
                          <span className={netProfit >= 0 ? 'text-success' : 'text-destructive'}>
                            {formatCurrency(netProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Previous Earnings</span>
                          <span>{formatCurrency(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between font-semibold text-primary border-t pt-2">
                      <span>Total Equity</span>
                      <span>{formatCurrency(netProfit)}</span>
                    </div>
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