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
  CreditCard
} from "lucide-react";
import FinancialReports from "./FinancialReports";
import CommissionReports from "@/components/reports/CommissionReports";
import AccountsReports from "@/components/reports/AccountsReports";

const reportTabs = [
  { 
    id: "financial", 
    name: "Financial Reports", 
    icon: BarChart3, 
    description: "Revenue and expense analysis" 
  },
  { 
    id: "accounts", 
    name: "Accounts Reports", 
    icon: CreditCard, 
    description: "Account balances and transactions" 
  },
  { 
    id: "commission", 
    name: "Commission Reports", 
    icon: Percent, 
    description: "Guide and agent commissions" 
  },
  { 
    id: "occupancy", 
    name: "Occupancy Reports", 
    icon: Building2, 
    description: "Room occupancy analysis" 
  },
  { 
    id: "trends", 
    name: "Trend Analysis", 
    icon: TrendingUp, 
    description: "Performance trends" 
  },
];

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "financial";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "financial":
        return <FinancialReports />;
      case "accounts":
        return <AccountsReports />;
      case "commission":
        return <CommissionReports />;
      case "occupancy":
        return <div className="text-center text-muted-foreground py-12">Occupancy reports coming soon...</div>;
      case "trends":
        return <div className="text-center text-muted-foreground py-12">Trend analysis coming soon...</div>;
      default:
        return <FinancialReports />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Reports</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Analytics and insights
          </p>
        </div>
        
        <nav className="p-4">
          <div className="space-y-2">
            {reportTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  <div>
                    <div>{tab.name}</div>
                    <div className="text-xs opacity-75">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderTabContent()}
      </div>
    </div>
  );
}