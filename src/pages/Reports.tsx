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
  const [accountTransactions, setAccountTransactions] = useState<Record<string, any[]>>({});
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [usdToLkrRate, setUsdToLkrRate] = useState<number>(300);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    fetchData();
    loadCurrencySettings();
  }, []);

  const loadCurrencySettings = () => {
    const savedRate = localStorage.getItem('usdToLkrRate');
    if (savedRate) {
      setUsdToLkrRate(Number(savedRate));
    }
  };

  useEffect(() => {
    if (accounts.length > 0 && activeTab === "balance-sheet") {
      fetchAccountTransactions();
    }
  }, [accounts, activeTab]);

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

  const filterByMonth = (data: any[]) => {
    if (selectedMonth === "all") return data;
    return data.filter(item => {
      const itemDate = new Date(item.date || item.created_at);
      const itemMonth = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      return itemMonth === selectedMonth;
    });
  };

  const getFilteredData = (data: any[]) => {
    let filtered = filterByLocation(data);
    if (selectedMonth !== "all") {
      filtered = filterByMonth(filtered);
    } else {
      filtered = filterByDateRange(filtered);
    }
    return filtered;
  };

  // Get available months from existing data
  const getAvailableMonths = () => {
    const allData = [...income, ...expenses];
    const months = new Set<string>();
    
    allData.forEach(item => {
      const itemDate = new Date(item.date || item.created_at);
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    return Array.from(months).sort().reverse(); // Most recent first
  };

  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
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

  // Helper function to convert amounts to LKR equivalent
  const convertToLkr = (amount: number, currency: string) => {
    if (currency === "USD") {
      return amount * 300; // Fixed conversion rate for PDF reports
    }
    return amount; // Already in LKR
  };

  // Helper function to get all amounts in LKR equivalent
  const getAmountInLkr = (item: any) => {
    return convertToLkr(Number(item.amount), item.accounts?.currency || 'LKR');
  };

  // Helper function to format currency display (shows original currency)
  const formatCurrencyDisplay = (amount: number, currency: string = "LKR") => {
    if (currency === "USD") {
      return `$${Math.abs(amount).toLocaleString()}`;
    }
    return `Rs.${Math.abs(amount).toLocaleString()}`;
  };

  // Helper function for LKR totals only (always shows Rs.)
  const formatCurrency = (amount: number, currency: string = "LKR") => {
    return `Rs.${Math.abs(amount).toLocaleString()}`;
  };

  const fetchAccountTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const transactions: Record<string, any[]> = {};
      
      for (const account of accounts) {
        const accountTxns: any[] = [];
        
        // Fetch income for this account
        const { data: incomeData } = await supabase
          .from("income")
          .select("*, locations(*)")
          .eq("account_id", account.id)
          .order("date", { ascending: false });
        
        // Fetch expenses for this account
        const { data: expenseData } = await supabase
          .from("expenses")
          .select("*, locations(*)")
          .eq("account_id", account.id)
          .order("date", { ascending: false });
        
        // Fetch transfers FROM this account
        const { data: transfersFrom } = await supabase
          .from("account_transfers")
          .select("*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*)")
          .eq("from_account_id", account.id)
          .order("created_at", { ascending: false });
        
        // Fetch transfers TO this account
        const { data: transfersTo } = await supabase
          .from("account_transfers")
          .select("*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*)")
          .eq("to_account_id", account.id)
          .order("created_at", { ascending: false });
        
        // Add income transactions
        (incomeData || []).forEach(item => {
          accountTxns.push({
            type: 'income',
            date: item.date,
            description: `${item.type} - ${item.locations?.name || 'Unknown Location'}`,
            amount: item.amount,
            balance_change: item.amount,
            note: item.note,
            created_at: item.created_at
          });
        });
        
        // Add expense transactions
        (expenseData || []).forEach(item => {
          accountTxns.push({
            type: 'expense',
            date: item.date,
            description: `${item.main_type} - ${item.sub_type} (${item.locations?.name || 'Unknown Location'})`,
            amount: item.amount,
            balance_change: -item.amount,
            note: item.note,
            created_at: item.created_at
          });
        });
        
        // Add transfer FROM transactions
        (transfersFrom || []).forEach(item => {
          accountTxns.push({
            type: 'transfer_out',
            date: new Date(item.created_at).toISOString().split('T')[0],
            description: `Transfer to ${item.to_account?.name || 'Unknown Account'}`,
            amount: item.amount,
            balance_change: -item.amount,
            note: item.note,
            created_at: item.created_at
          });
        });
        
        // Add transfer TO transactions
        (transfersTo || []).forEach(item => {
          accountTxns.push({
            type: 'transfer_in',
            date: new Date(item.created_at).toISOString().split('T')[0],
            description: `Transfer from ${item.from_account?.name || 'Unknown Account'}`,
            amount: item.amount * item.conversion_rate,
            balance_change: item.amount * item.conversion_rate,
            note: item.note,
            created_at: item.created_at
          });
        });
        
        // Sort by date (newest first)
        accountTxns.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        transactions[account.id] = accountTxns;
      }
      
      setAccountTransactions(transactions);
    } catch (error) {
      console.error("Error fetching account transactions:", error);
    } finally {
      setLoadingTransactions(false);
    }
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

    // Summary section with light box - using LKR equivalent amounts
    const totalIncome = filteredIncome.reduce((sum, item) => sum + getAmountInLkr(item), 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
      const sourceTotal = items.reduce((sum, item) => sum + getAmountInLkr(item), 0);
      
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
      const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + getAmountInLkr(item), 0);
      
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
        const subTypeTotal = items.reduce((sum, item) => sum + getAmountInLkr(item), 0);
        
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

  const generateBalanceSheetPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    
    // Professional header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text('BALANCE SHEET', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, yPos, { align: 'center' });
    yPos += 15;

    // Assets Section with light box
    doc.setFillColor(245, 255, 245); // Light green background
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPos - 5, 180, 10, 'S');
    
    doc.setFontSize(14);
    doc.text('ASSETS', 20, yPos + 3);
    yPos += 15;

    let totalAssets = 0;
    accounts.forEach(account => {
      const accountTxns = accountTransactions[account.id] || [];
      const currentBalance = account.initial_balance + 
        accountTxns.reduce((sum, txn) => sum + txn.balance_change, 0);
      totalAssets += currentBalance;
      
      // Account header with light background
      doc.setFillColor(250, 250, 250);
      doc.rect(20, yPos - 3, 170, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.rect(20, yPos - 3, 170, 8, 'S');
      
      doc.setFontSize(11);
      doc.text(`${account.name} (${account.currency})`, 25, yPos + 2);
      doc.text(`${formatCurrency(currentBalance, account.currency)}`, 185, yPos + 2, { align: 'right' });
      yPos += 12;

      // Recent transactions
      const recentTxns = accountTxns.slice(0, 5);
      recentTxns.forEach(txn => {
        doc.setFontSize(9);
        const date = new Date(txn.date).toLocaleDateString();
        doc.text(`  ${date} - ${txn.description}`, 30, yPos);
        doc.text(`${txn.balance_change >= 0 ? '+' : ''}${formatCurrency(txn.balance_change, account.currency)}`, 185, yPos, { align: 'right' });
        yPos += 6;
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });
      yPos += 5;
    });

    // Total Assets
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 3, 170, 8, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPos - 3, 170, 8, 'S');
    
    doc.setFontSize(12);
    doc.text('TOTAL ASSETS', 25, yPos + 2);
    doc.text(`${formatCurrency(totalAssets)}`, 185, yPos + 2, { align: 'right' });
    yPos += 20;

    // Equity Section
    doc.setFillColor(245, 245, 255); // Light blue background
    doc.rect(15, yPos - 5, 180, 10, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(15, yPos - 5, 180, 10, 'S');
    
    doc.setFontSize(14);
    doc.text("OWNER'S EQUITY", 20, yPos + 3);
    yPos += 15;

    const netProfit = totalIncome - totalExpenses;
    
    doc.setFillColor(250, 250, 250);
    doc.rect(20, yPos - 3, 170, 8, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.rect(20, yPos - 3, 170, 8, 'S');
    
    doc.setFontSize(11);
    doc.text('Net Income', 25, yPos + 2);
    doc.text(`${formatCurrency(netProfit)}`, 185, yPos + 2, { align: 'right' });
    yPos += 12;

    // Total Equity
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 3, 170, 8, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, yPos - 3, 170, 8, 'S');
    
    doc.setFontSize(12);
    doc.text('TOTAL EQUITY', 25, yPos + 2);
    doc.text(`${formatCurrency(netProfit)}`, 185, yPos + 2, { align: 'right' });
    
    doc.save(`balance-sheet-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div className="container mx-auto p-4 sm:p-6">Loading...</div>;
  }

  const totalIncome = filteredIncome.reduce((sum, item) => sum + getAmountInLkr(item), 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
               <Label>Month Filter</Label>
               <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All Months</SelectItem>
                   {getAvailableMonths().map((monthKey) => (
                     <SelectItem key={monthKey} value={monthKey}>
                       {formatMonthDisplay(monthKey)}
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
                     const sourceTotal = items.reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
                           <div className="space-y-2 max-h-64 overflow-y-auto">
                             {items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item) => (
                               <div key={item.id} className="flex justify-between text-sm">
                                 <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                 <span>{formatCurrencyDisplay(Number(item.amount), item.accounts?.currency || 'LKR')}</span>
                               </div>
                             ))}
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
                     const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
                               const subTypeTotal = items.reduce((sum, item) => sum + getAmountInLkr(item), 0);
                               return (
                                <div key={subType} className="border-l-2 border-muted pl-4">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm">{subType}</span>
                                    <span className="font-medium">{formatCurrency(subTypeTotal)}</span>
                                  </div>
                                   <div className="max-h-48 overflow-y-auto space-y-1">
                                     {items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((item) => (
                                       <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                                         <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                         <span>{formatCurrencyDisplay(Number(item.amount), item.accounts?.currency || 'LKR')}</span>
                                       </div>
                                     ))}
                                   </div>
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
                       const sourceTotal = items.reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
                       const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + getAmountInLkr(item), 0);
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
          <div className="flex gap-4 mb-6">
            <Button onClick={() => generateBalanceSheetPDF()} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download Balance Sheet PDF
            </Button>
          </div>
          
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Detailed Balance Sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Account Details with Transactions */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-success">Account Details</h3>
                  {loadingTransactions ? (
                    <div className="text-center py-8">Loading account transactions...</div>
                  ) : (
                    accounts.map((account) => {
                      const accountTxns = accountTransactions[account.id] || [];
                      const currentBalance = account.initial_balance + 
                        accountTxns.reduce((sum, txn) => sum + txn.balance_change, 0);
                      
                      return (
                        <Collapsible key={account.id} className="border rounded-lg">
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <div>
                                <span className="font-medium">{account.name}</span>
                                <p className="text-sm text-muted-foreground">{account.currency} Account</p>
                              </div>
                            </div>
                             <div className="text-right">
                               <div className="font-bold text-lg">
                                 {formatCurrencyDisplay(currentBalance, account.currency)}
                               </div>
                              <p className="text-xs text-muted-foreground">
                                {accountTxns.length} transactions
                              </p>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-4">
                            <div className="space-y-4">
                              {/* Account Summary */}
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium mb-3">Account Summary</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Initial Balance:</span>
                                    <div className="font-medium">{formatCurrency(account.initial_balance, account.currency)}</div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Income:</span>
                                    <div className="font-medium text-success">
                                      {formatCurrency(
                                        accountTxns.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
                                        account.currency
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Total Expenses:</span>
                                    <div className="font-medium text-destructive">
                                      {formatCurrency(
                                        accountTxns.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
                                        account.currency
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Current Balance:</span>
                                    <div className="font-medium">{formatCurrency(currentBalance, account.currency)}</div>
                                  </div>
                                </div>
                              </div>
                              
                               {/* Transaction History */}
                               <div>
                                 <h4 className="font-medium mb-3">Transaction History (Sorted by Date)</h4>
                                 <div className="space-y-2 max-h-96 overflow-y-auto">
                                   {accountTxns.length === 0 ? (
                                     <p className="text-muted-foreground text-center py-4">No transactions found</p>
                                   ) : (
                                     (() => {
                                       // Sort transactions by date ascending for running balance calculation
                                       const sortedTxns = [...accountTxns].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                                       let runningBalance = account.initial_balance;
                                       
                                       // Calculate running balance for each transaction
                                       const txnsWithBalance = sortedTxns.map(txn => {
                                         runningBalance += txn.balance_change;
                                         return { ...txn, runningBalance };
                                       });
                                       
                                       // Reverse to show newest first for display
                                       return txnsWithBalance.reverse().map((txn, index) => (
                                         <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg text-sm">
                                           <div className="col-span-3">
                                             <div className="flex items-center gap-2">
                                               <Badge 
                                                 variant={
                                                   txn.type === 'income' ? 'default' :
                                                   txn.type === 'expense' ? 'destructive' :
                                                   txn.type === 'transfer_in' ? 'secondary' : 'outline'
                                                 }
                                                 className="text-xs"
                                               >
                                                 {txn.type.replace('_', ' ').toUpperCase()}
                                               </Badge>
                                             </div>
                                             <div className="text-xs text-muted-foreground mt-1">
                                               {new Date(txn.date).toLocaleDateString()}
                                             </div>
                                             <div className="text-xs text-muted-foreground">
                                               {new Date(txn.created_at).toLocaleTimeString()}
                                             </div>
                                           </div>
                                           <div className="col-span-4">
                                             <p className="font-medium text-sm">{txn.description}</p>
                                             {txn.note && (
                                               <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>
                                             )}
                                           </div>
                                           <div className="col-span-2 text-right">
                                              <div className={`font-medium ${
                                                txn.balance_change >= 0 ? 'text-success' : 'text-destructive'
                                              }`}>
                                                {txn.balance_change >= 0 ? '+' : ''}{formatCurrencyDisplay(txn.balance_change, account.currency)}
                                              </div>
                                            </div>
                                            <div className="col-span-3 text-right">
                                              <div className="font-bold text-primary">
                                                {formatCurrencyDisplay(txn.runningBalance, account.currency)}
                                              </div>
                                             <div className="text-xs text-muted-foreground">Balance</div>
                                           </div>
                                         </div>
                                       ));
                                     })()
                                   )}
                                 </div>
                               </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })
                  )}
                </div>
                
                {/* Summary Section */}
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Assets Summary */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-success">Total Assets</h3>
                      <div className="space-y-3">
                        {accounts.map((account) => {
                          const accountTxns = accountTransactions[account.id] || [];
                          const currentBalance = account.initial_balance + 
                            accountTxns.reduce((sum, txn) => sum + txn.balance_change, 0);
                          
                          return (
                             <div key={account.id} className="flex justify-between p-3 bg-muted/50 rounded-lg">
                               <span className="font-medium">{account.name}</span>
                               <span className="font-bold">{formatCurrencyDisplay(currentBalance, account.currency)}</span>
                             </div>
                           );
                         })}
                         <div className="flex justify-between font-bold text-lg border-t pt-3">
                           <span>Total Assets</span>
                           <span className="text-success">
                             {formatCurrency(
                               accounts.reduce((sum, account) => {
                                 const accountTxns = accountTransactions[account.id] || [];
                                 const currentBalance = account.initial_balance + 
                                   accountTxns.reduce((txnSum, txn) => txnSum + txn.balance_change, 0);
                                 return sum + convertToLkr(currentBalance, account.currency);
                               }, 0)
                             )}
                           </span>
                         </div>
                      </div>
                    </div>

                    {/* Equity Summary */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary">Owner's Equity</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-muted/50 rounded-lg">
                          <span>Net Income</span>
                          <span className={`font-medium ${netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(netProfit)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-3">
                          <span>Total Equity</span>
                          <span className="text-primary">{formatCurrency(netProfit)}</span>
                        </div>
                      </div>
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