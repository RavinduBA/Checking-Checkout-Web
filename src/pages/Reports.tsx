import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";

const mockData = {
  income: {
    today: 15000,
    thisWeek: 45000,
    thisMonth: 180000,
    thisYear: 2160000
  },
  expenses: {
    today: 3500,
    thisWeek: 12000,
    thisMonth: 48000,
    thisYear: 576000
  },
  profit: {
    today: 11500,
    thisWeek: 33000,
    thisMonth: 132000,
    thisYear: 1584000
  }
};

const accounts = [
  { name: "Sampath Bank", balance: 150000, currency: "LKR" },
  { name: "Payoneer", balance: 500, currency: "USD" },
  { name: "Asaliya Cash", balance: 25000, currency: "LKR" },
  { name: "Wishva Account", balance: 75000, currency: "LKR" }
];

const locations = ["All Locations", "Asaliya Villa", "Rusty Bunk", "Antiqua Serenity"];

export default function Reports() {
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
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
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(mockData.income.today)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Income</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(mockData.income.thisWeek)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Income</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(mockData.income.thisMonth)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Income</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-elegant">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Year</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(mockData.income.thisYear)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Income</p>
              </CardContent>
            </Card>
          </div>

          {/* Income vs Expenses */}
          <Card className="bg-gradient-card border-0 shadow-elegant">
            <CardHeader>
              <CardTitle>Income vs Expenses Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-emerald-600">Income</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Today</span>
                      <span className="font-medium">{formatCurrency(mockData.income.today)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium">{formatCurrency(mockData.income.thisMonth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Year</span>
                      <span className="font-medium">{formatCurrency(mockData.income.thisYear)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-red-600">Expenses</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Today</span>
                      <span className="font-medium">{formatCurrency(mockData.expenses.today)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium">{formatCurrency(mockData.expenses.thisMonth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Year</span>
                      <span className="font-medium">{formatCurrency(mockData.expenses.thisYear)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-blue-600">Profit</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Today</span>
                      <span className="font-medium">{formatCurrency(mockData.profit.today)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Month</span>
                      <span className="font-medium">{formatCurrency(mockData.profit.thisMonth)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">This Year</span>
                      <span className="font-medium">{formatCurrency(mockData.profit.thisYear)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <div className="flex justify-between">
                      <span>Booking Income</span>
                      <span>{formatCurrency(150000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Laundry Income</span>
                      <span>{formatCurrency(20000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Food Income</span>
                      <span>{formatCurrency(10000)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Revenue</span>
                      <span>{formatCurrency(180000)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-red-600 mb-4">Expenses</h3>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span>Utilities</span>
                      <span>{formatCurrency(15000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Staff</span>
                      <span>{formatCurrency(20000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maintenance</span>
                      <span>{formatCurrency(8000)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Commission</span>
                      <span>{formatCurrency(5000)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Expenses</span>
                      <span>{formatCurrency(48000)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Profit</span>
                    <span className="text-blue-600">{formatCurrency(132000)}</span>
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
                {accounts.map((account, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{account.name}</h3>
                      <Badge variant="outline">{account.currency}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {formatCurrency(account.balance, account.currency)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Assets</span>
                    <span>{formatCurrency(250000)} + $500</span>
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