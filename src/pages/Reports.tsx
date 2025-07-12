import { useState, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Download, BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

      {/* Main Report Content */}
      <div className="grid grid-cols-1 gap-6">
        {/* Hierarchical Income Report */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Income Breakdown
              </CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Total: {formatCurrency(filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0))}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(groupIncomeBySource(filteredIncome)).map(([source, items]) => {
                const sourceTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
                const isExpanded = expandedIncomeSection === source || expandedIncomeSection === "all";
                
                return (
                  <Collapsible 
                    key={source} 
                    open={isExpanded}
                    onOpenChange={(open) => setExpandedIncomeSection(open ? source : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg cursor-pointer border border-green-200 transition-colors">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-green-600" /> : <ChevronRight className="h-4 w-4 text-green-600" />}
                          <span className="font-semibold text-green-800">{source}</span>
                          <Badge variant="outline" className="bg-white border-green-300 text-green-700">
                            {items.length} entries
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-800">{formatCurrency(sourceTotal)}</div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded border border-green-100 hover:shadow-sm transition-shadow">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(item.date).toLocaleDateString()} - {item.accounts?.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.locations?.name} • {item.accounts?.currency}
                                {item.note && ` • ${item.note}`}
                              </div>
                            </div>
                            <div className="text-green-700 font-semibold">
                              {formatCurrency(Number(item.amount), item.accounts?.currency)}
                            </div>
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

        {/* Hierarchical Expense Report */}
        <Card className="bg-gradient-card border-0 shadow-elegant">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <TrendingDown className="h-5 w-5" />
                Expense Breakdown
              </CardTitle>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                Total: {formatCurrency(filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0))}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(groupByMainAndSubType(filteredExpenses)).map(([mainType, subTypes]) => {
                const mainTypeTotal = Object.values(subTypes).flat().reduce((sum, item) => sum + Number(item.amount), 0);
                const mainTypeKey = `main-${mainType}`;
                const isMainExpanded = expandedExpenseSection === mainTypeKey || expandedExpenseSection === "all" || !expandedExpenseSection;
                
                return (
                  <Collapsible 
                    key={mainType}
                    open={isMainExpanded}
                    onOpenChange={(open) => setExpandedExpenseSection(open ? mainTypeKey : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer border border-red-200 transition-colors">
                        <div className="flex items-center gap-3">
                          {isMainExpanded ? <ChevronDown className="h-4 w-4 text-red-600" /> : <ChevronRight className="h-4 w-4 text-red-600" />}
                          <span className="font-semibold text-red-800">{mainType.toUpperCase()}</span>
                          <Badge variant="outline" className="bg-white border-red-300 text-red-700">
                            {Object.keys(subTypes).length} categories
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-800">{formatCurrency(mainTypeTotal)}</div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2">
                        {Object.entries(subTypes).map(([subType, items]) => {
                          const subTypeTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
                          const subTypeKey = `sub-${mainType}-${subType}`;
                          const isSubExpanded = expandedExpenseSection === subTypeKey || expandedExpenseSection === "all" || !expandedExpenseSection;
                          
                          return (
                            <Collapsible 
                              key={subType}
                              open={isSubExpanded}
                              onOpenChange={(open) => setExpandedExpenseSection(open ? subTypeKey : null)}
                            >
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 rounded border border-orange-200 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-2">
                                    {isSubExpanded ? <ChevronDown className="h-3 w-3 text-orange-600" /> : <ChevronRight className="h-3 w-3 text-orange-600" />}
                                    <span className="font-medium text-orange-800">{subType}</span>
                                    <Badge variant="outline" className="bg-white border-orange-300 text-orange-700 text-xs">
                                      {items.length} entries
                                    </Badge>
                                  </div>
                                  <div className="font-semibold text-orange-800">{formatCurrency(subTypeTotal)}</div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-6 mt-2 space-y-1">
                                  {items.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-orange-100 hover:shadow-sm transition-shadow">
                                      <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                          {new Date(item.date).toLocaleDateString()} - {item.accounts?.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {item.locations?.name} • {item.accounts?.currency}
                                          {item.note && ` • ${item.note}`}
                                        </div>
                                      </div>
                                      <div className="text-red-700 font-semibold">
                                        {formatCurrency(Number(item.amount), item.accounts?.currency)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
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
    </div>
  );
}