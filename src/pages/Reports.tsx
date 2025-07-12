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
import jsPDF from 'jspdf';

type Income = Tables<"income"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Expense = Tables<"expenses"> & {
  locations: Tables<"locations">;
  accounts: Tables<"accounts">;
};

type Transfer = Tables<"account_transfers"> & {
  from_account: Tables<"accounts">;
  to_account: Tables<"accounts">;
};

type Location = Tables<"locations">;
type Account = Tables<"accounts">;

export default function Reports() {
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIncomeSection, setExpandedIncomeSection] = useState<string | null>("all");
  const [expandedExpenseSection, setExpandedExpenseSection] = useState<string | null>("all");
  const [expandAllSections, setExpandAllSections] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [incomeData, expenseData, transferData, locationData, accountData] = await Promise.all([
        supabase.from("income").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("expenses").select("*, locations(*), accounts(*)").order("created_at", { ascending: false }),
        supabase.from("account_transfers").select(`
          *, 
          from_account:accounts!from_account_id(*), 
          to_account:accounts!to_account_id(*)
        `).order("created_at", { ascending: false }),
        supabase.from("locations").select("*").eq("is_active", true),
        supabase.from("accounts").select("*")
      ]);

      setIncome(incomeData.data || []);
      setExpenses(expenseData.data || []);
      setTransfers(transferData.data || []);
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

  const calculateTotals = (data: any[]) => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const thisYear = new Date(today.getFullYear(), 0, 1);

    return {
      today: data.filter(item => new Date(item.date || item.created_at).toDateString() === today.toDateString())
        .reduce((sum, item) => sum + Number(item.amount), 0),
      thisMonth: data.filter(item => new Date(item.date || item.created_at) >= thisMonth)
        .reduce((sum, item) => sum + Number(item.amount), 0),
      thisYear: data.filter(item => new Date(item.date || item.created_at) >= thisYear)
        .reduce((sum, item) => sum + Number(item.amount), 0)
    };
  };

  const calculateAccountBalances = () => {
    const balances: Record<string, number> = {};
    
    // Initialize with initial balances
    accounts.forEach(account => {
      balances[account.id] = Number(account.initial_balance);
    });
    
    // Add income
    income.forEach(inc => {
      if (balances[inc.account_id] !== undefined) {
        balances[inc.account_id] += Number(inc.amount);
      }
    });
    
    // Subtract expenses
    expenses.forEach(exp => {
      if (balances[exp.account_id] !== undefined) {
        balances[exp.account_id] -= Number(exp.amount);
      }
    });
    
    // Handle transfers
    transfers.forEach(transfer => {
      if (balances[transfer.from_account_id] !== undefined) {
        balances[transfer.from_account_id] -= Number(transfer.amount);
      }
      if (balances[transfer.to_account_id] !== undefined) {
        balances[transfer.to_account_id] += Number(transfer.amount) * Number(transfer.conversion_rate);
      }
    });
    
    return balances;
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

  const accountBalances = calculateAccountBalances();

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

  const generateHTMLReport = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; border-bottom: 3px solid #333; padding-bottom: 20px; }
          .summary { background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .section { margin: 30px 0; }
          .section h2 { color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
          .item { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 4px solid #007bff; }
          .total { font-weight: bold; color: #007bff; }
          .profit { color: green; }
          .loss { color: red; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .positive { color: #059669; }
          .negative { color: #dc2626; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Financial Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <p>Period: ${startDate || 'All time'} ${endDate ? `to ${endDate}` : ''}</p>
          <p>Location: ${selectedLocation === 'all' ? 'All Locations' : locations.find(l => l.id === selectedLocation)?.name || 'Unknown'}</p>
        </div>

        <div class="summary">
          <h2>Executive Summary</h2>
          <table>
            <tr><th>Period</th><th>Income</th><th>Expenses</th><th>Net Profit</th></tr>
            <tr>
              <td>Today</td>
              <td class="positive">${formatCurrency(incomeTotal.today)}</td>
              <td class="negative">${formatCurrency(expenseTotal.today)}</td>
              <td class="${profit.today >= 0 ? 'positive' : 'negative'}">${formatCurrency(profit.today)}</td>
            </tr>
            <tr>
              <td>This Month</td>
              <td class="positive">${formatCurrency(incomeTotal.thisMonth)}</td>
              <td class="negative">${formatCurrency(expenseTotal.thisMonth)}</td>
              <td class="${profit.thisMonth >= 0 ? 'positive' : 'negative'}">${formatCurrency(profit.thisMonth)}</td>
            </tr>
            <tr>
              <td>This Year</td>
              <td class="positive">${formatCurrency(incomeTotal.thisYear)}</td>
              <td class="negative">${formatCurrency(expenseTotal.thisYear)}</td>
              <td class="${profit.thisYear >= 0 ? 'positive' : 'negative'}">${formatCurrency(profit.thisYear)}</td>
            </tr>
          </table>
        </div>

        <div class="section">
          <h2>Account Balances</h2>
          <table>
            <tr><th>Account</th><th>Currency</th><th>Balance</th></tr>
            ${Object.entries(accountBalances).map(([accountId, balance]) => {
              const account = accounts.find(a => a.id === accountId);
              return account ? `
                <tr>
                  <td>${account.name}</td>
                  <td>${account.currency}</td>
                  <td class="${balance >= 0 ? 'positive' : 'negative'}">${formatCurrency(balance, account.currency)}</td>
                </tr>
              ` : '';
            }).join('')}
          </table>
        </div>

        <div class="section">
          <h2>Income Breakdown</h2>
          ${Object.entries(groupByType(filteredIncome)).map(([type, items]) => `
            <div class="item">
              <h3>${type.replace('_', ' ').toUpperCase()}</h3>
              <p class="total">Total: ${formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}</p>
              ${Object.entries(groupByLocation(items)).map(([location, locationItems]) => `
                <div style="margin-left: 20px;">
                  <h4>${location}</h4>
                  <p>Amount: ${formatCurrency(locationItems.reduce((sum, item) => sum + Number(item.amount), 0))}</p>
                  <ul>
                    ${locationItems.map((item) => `
                      <li>${new Date(item.date).toLocaleDateString()} - ${item.accounts?.name}: ${formatCurrency(Number(item.amount))}</li>
                    `).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>

        <div class="section">
          <h2>Expense Breakdown</h2>
          ${Object.entries(groupByType(filteredExpenses)).map(([type, items]) => `
            <div class="item">
              <h3>${type.replace('_', ' ').toUpperCase()}</h3>
              <p class="total">Total: ${formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}</p>
              ${Object.entries(groupByLocation(items)).map(([location, locationItems]) => `
                <div style="margin-left: 20px;">
                  <h4>${location}</h4>
                  <p>Amount: ${formatCurrency(locationItems.reduce((sum, item) => sum + Number(item.amount), 0))}</p>
                  <ul>
                    ${locationItems.map((item) => {
                      const expenseItem = item as Expense;
                      return `<li>${new Date(expenseItem.date).toLocaleDateString()} - ${expenseItem.sub_type}: ${formatCurrency(Number(expenseItem.amount))}</li>`;
                    }).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Financial Reports', 20, 30);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
    
    let yPos = 55;
    
    // Summary
    doc.setFontSize(14);
    doc.text('Summary', 20, yPos);
    yPos += 15;
    doc.setFontSize(12);
    doc.text(`Total Income (Year): ${formatCurrency(incomeTotal.thisYear)}`, 20, yPos);
    yPos += 10;
    doc.text(`Total Expenses (Year): ${formatCurrency(expenseTotal.thisYear)}`, 20, yPos);
    yPos += 10;
    doc.text(`Net Profit (Year): ${formatCurrency(profit.thisYear)}`, 20, yPos);
    yPos += 20;
    
    // Income Details
    doc.setFontSize(14);
    doc.text('Income Details', 20, yPos);
    yPos += 15;
    doc.setFontSize(10);
    
    Object.entries(groupByType(filteredIncome)).forEach(([type, items]) => {
      doc.text(`${type.replace('_', ' ').toUpperCase()}:`, 30, yPos);
      const typeTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      doc.text(`${formatCurrency(typeTotal)}`, 120, yPos);
      yPos += 8;
      
      Object.entries(groupByLocation(items)).forEach(([location, locationItems]) => {
        doc.text(`  ${location}:`, 40, yPos);
        const locationTotal = locationItems.reduce((sum, item) => sum + Number(item.amount), 0);
        doc.text(`${formatCurrency(locationTotal)}`, 120, yPos);
        yPos += 6;
        
        locationItems.forEach((item) => {
          doc.text(`    ${new Date(item.date).toLocaleDateString()} - ${item.accounts?.name}`, 50, yPos);
          doc.text(`${formatCurrency(Number(item.amount))}`, 120, yPos);
          yPos += 5;
          if (yPos > 280) { // New page
            doc.addPage();
            yPos = 20;
          }
        });
      });
      yPos += 5;
    });
    
    yPos += 10;
    
    // Expense Details
    doc.setFontSize(14);
    doc.text('Expense Details', 20, yPos);
    yPos += 15;
    doc.setFontSize(10);
    
    Object.entries(groupByType(filteredExpenses)).forEach(([type, items]) => {
      doc.text(`${type.replace('_', ' ').toUpperCase()}:`, 30, yPos);
      const typeTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      doc.text(`${formatCurrency(typeTotal)}`, 120, yPos);
      yPos += 8;
      
      Object.entries(groupByLocation(items)).forEach(([location, locationItems]) => {
        doc.text(`  ${location}:`, 40, yPos);
        const locationTotal = locationItems.reduce((sum, item) => sum + Number(item.amount), 0);
        doc.text(`${formatCurrency(locationTotal)}`, 120, yPos);
        yPos += 6;
        
        locationItems.forEach((item) => {
          const expenseItem = item as Expense;
          doc.text(`    ${new Date(expenseItem.date).toLocaleDateString()} - ${expenseItem.sub_type}`, 50, yPos);
          doc.text(`${formatCurrency(Number(expenseItem.amount))}`, 120, yPos);
          yPos += 5;
          if (yPos > 280) { // New page
            doc.addPage();
            yPos = 20;
          }
        });
      });
      yPos += 5;
    });
    
    // Account Balances (New page)
    doc.addPage();
    yPos = 30;
    doc.setFontSize(14);
    doc.text('Account Balances', 20, yPos);
    yPos += 15;
    doc.setFontSize(12);
    Object.entries(accountBalances).forEach(([accountId, balance]) => {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        doc.text(`${account.name}: ${formatCurrency(balance, account.currency)}`, 30, yPos);
        yPos += 10;
      }
    });
    
    doc.save(`financial-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
            <div className="flex items-end gap-2">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => {
                  setExpandAllSections(!expandAllSections);
                  setExpandedIncomeSection(expandAllSections ? null : "all");
                  setExpandedExpenseSection(expandAllSections ? null : "all");
                }}
              >
                {expandAllSections ? "Collapse All" : "Expand All"}
              </Button>
              <Button variant="outline" onClick={generateHTMLReport}>
                <Download className="h-4 w-4 mr-2" />
                HTML Report
              </Button>
              <Button variant="outline" onClick={generatePDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
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
                      open={expandedIncomeSection === type || expandedIncomeSection === "all"}
                      onOpenChange={() => setExpandedIncomeSection(expandedIncomeSection === type ? null : type)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                          <div className="flex items-center gap-3">
                            {(expandedIncomeSection === type || expandedIncomeSection === "all") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                              {locationItems.map((item) => (
                                <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                                  <span>{new Date(item.date).toLocaleDateString()} - {item.accounts?.name}</span>
                                  <span>{formatCurrency(Number(item.amount))}</span>
                                </div>
                              ))}
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
                      open={expandedExpenseSection === type || expandedExpenseSection === "all"}
                      onOpenChange={() => setExpandedExpenseSection(expandedExpenseSection === type ? null : type)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                          <div className="flex items-center gap-3">
                            {(expandedExpenseSection === type || expandedExpenseSection === "all") ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
                              {locationItems.map((item) => {
                                const expenseItem = item as Expense;
                                return (
                                  <div key={item.id} className="text-sm text-muted-foreground flex justify-between">
                                    <span>{new Date(expenseItem.date).toLocaleDateString()} - {expenseItem.sub_type} ({expenseItem.accounts?.name})</span>
                                    <span>{formatCurrency(Number(expenseItem.amount))}</span>
                                  </div>
                                );
                              })}
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
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-emerald-600 font-semibold">
                          {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total Revenue</span>
                      <span className="text-emerald-600">{formatCurrency(incomeTotal.thisYear)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-red-600 mb-4">Expenses</h3>
                  <div className="space-y-2 pl-4">
                    {Object.entries(groupByType(filteredExpenses)).map(([type, items]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="text-red-600 font-semibold">
                          {formatCurrency(items.reduce((sum, item) => sum + Number(item.amount), 0))}
                        </span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total Expenses</span>
                      <span className="text-red-600">{formatCurrency(expenseTotal.thisYear)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Net Profit</span>
                    <span className={profit.thisYear >= 0 ? 'text-blue-600' : 'text-red-600'}>
                      {formatCurrency(profit.thisYear)}
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
                {accounts.map((account) => {
                  const balance = accountBalances[account.id] || 0;
                  return (
                    <div key={account.id} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">{account.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Initial: {formatCurrency(Number(account.initial_balance), account.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(balance, account.currency)}
                        </p>
                        <Badge variant="outline">{account.currency}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Transfer History */}
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>Transfer History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transfers.slice(0, 10).map((transfer) => (
                  <div key={transfer.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {transfer.from_account?.name} → {transfer.to_account?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transfer.created_at).toLocaleDateString()}
                        {transfer.note && ` - ${transfer.note}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(Number(transfer.amount))}
                      </p>
                      {transfer.conversion_rate !== 1 && (
                        <p className="text-xs text-muted-foreground">
                          Rate: {transfer.conversion_rate}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}