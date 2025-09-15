import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Percent,
  Calendar,
  Building2,
  CreditCard,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import FinancialReports from "./FinancialReports";
import CommissionReports from "@/components/reports/CommissionReports";
import AccountsReports from "@/components/reports/AccountsReports";
import EnhancedFinancialReports from "@/components/reports/EnhancedFinancialReports";
import DetailedBalanceSheet from "@/components/reports/DetailedBalanceSheet";

const reportTabs = [
  { 
    id: "financial", 
    name: "Financial Reports", 
    icon: BarChart3, 
    description: "Revenue and expense analysis",
    subItems: [
      { id: "summary", name: "Summary", description: "Overview of income & expenses" },
      { id: "profit-loss", name: "Profit & Loss", description: "P&L statement" },
      { id: "balance-sheet", name: "Balance Sheet", description: "Financial position" }
    ]
  },
  { 
    id: "accounts", 
    name: "Accounts Reports", 
    icon: CreditCard, 
    description: "Account balances and transactions",
    subItems: [
      { id: "balances", name: "Account Balances", description: "Current balances overview" },
      { id: "transactions", name: "Transaction History", description: "Detailed transaction logs" },
      { id: "transfers", name: "Account Transfers", description: "Inter-account transfers" }
    ]
  },
  { 
    id: "commission", 
    name: "Commission Reports", 
    icon: Percent, 
    description: "Guide and agent commissions",
    subItems: [
      { id: "guides", name: "Guide Commissions", description: "Tour guide earnings" },
      { id: "agents", name: "Agent Commissions", description: "Travel agent earnings" },
      { id: "summary", name: "Commission Summary", description: "Overall commission overview" }
    ]
  },
  { 
    id: "occupancy", 
    name: "Occupancy Reports", 
    icon: Building2, 
    description: "Room occupancy analysis",
    subItems: [
      { id: "monthly", name: "Monthly Occupancy", description: "Month-wise occupancy rates" },
      { id: "yearly", name: "Yearly Trends", description: "Annual occupancy trends" },
      { id: "room-wise", name: "Room Performance", description: "Individual room analysis" }
    ]
  },
  { 
    id: "trends", 
    name: "Trend Analysis", 
    icon: TrendingUp, 
    description: "Performance trends",
    subItems: [
      { id: "revenue", name: "Revenue Trends", description: "Revenue growth patterns" },
      { id: "booking", name: "Booking Patterns", description: "Reservation trends" },
      { id: "seasonal", name: "Seasonal Analysis", description: "Seasonal performance" }
    ]
  },
];

export default function Reports() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "financial";

  const renderTabContent = () => {
    switch (activeTab) {
      case "financial":
        return <EnhancedFinancialReports />;
      case "accounts":
        return <DetailedBalanceSheet />;
      case "commission":
        return <CommissionReports />;
      case "occupancy":
        return <div className="text-center text-muted-foreground py-12">Occupancy reports coming soon...</div>;
      case "trends":
        return <div className="text-center text-muted-foreground py-12">Trend analysis coming soon...</div>;
      default:
        return <EnhancedFinancialReports />;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Analytics and insights for your hotel management
        </p>
      </div>
      
      {renderTabContent()}
    </div>
  );
}