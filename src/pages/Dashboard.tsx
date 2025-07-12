import { useState } from "react";
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
import { Link } from "react-router-dom";

// Mock data - in real app this would come from Supabase
const mockData = {
  location: "Asaliya Villa",
  todayIncome: 45000,
  todayExpenses: 12000,
  weeklyIncome: 280000,
  weeklyExpenses: 85000,
  accounts: [
    { name: "Sampath Bank", balance: 125000, currency: "LKR" },
    { name: "Payoneer", balance: 450, currency: "USD" },
    { name: "Cash", balance: 25000, currency: "LKR" },
  ],
  upcomingBookings: [
    {
      id: 1,
      guestName: "John Smith",
      checkIn: "2025-01-13",
      checkOut: "2025-01-15",
      amount: 35000,
      source: "booking.com",
      status: "confirmed"
    },
    {
      id: 2,
      guestName: "Sarah Wilson",
      checkIn: "2025-01-14",
      checkOut: "2025-01-16",
      amount: 28000,
      source: "airbnb",
      status: "pending"
    }
  ]
};

export default function Dashboard() {
  const profit = mockData.weeklyIncome - mockData.weeklyExpenses;
  const profitPercentage = ((profit / mockData.weeklyIncome) * 100).toFixed(1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back!</h1>
          <p className="text-muted-foreground">Managing {mockData.location}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="villa" size="sm">
            <Link to="/income">
              <Plus className="h-4 w-4" />
              Add Income
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/expense">
              <Plus className="h-4 w-4" />
              Add Expense
            </Link>
          </Button>
        </div>
      </div>

      {/* Today's Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Income
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              Rs. {mockData.todayIncome.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Expenses
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              Rs. {mockData.todayExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              -5% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-soft hover:shadow-elegant transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Weekly Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
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
        <CardContent className="space-y-4">
          {mockData.accounts.map((account, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
              <div>
                <p className="font-medium text-foreground">{account.name}</p>
                <p className="text-sm text-muted-foreground">{account.currency} Account</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">
                  {account.currency === "USD" ? "$" : "Rs. "}
                  {account.balance.toLocaleString()}
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
          <Button asChild variant="outline" size="sm">
            <Link to="/calendar">
              <Eye className="h-4 w-4" />
              View All
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockData.upcomingBookings.map((booking) => (
            <div key={booking.id} className="p-4 rounded-lg bg-background/50 border border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{booking.guestName}</p>
                  <p className="text-sm text-muted-foreground">
                    {booking.checkIn} to {booking.checkOut}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {booking.status}
                  </Badge>
                  <Badge variant="outline">
                    {booking.source}
                  </Badge>
                  <span className="font-bold text-success">
                    Rs. {booking.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}