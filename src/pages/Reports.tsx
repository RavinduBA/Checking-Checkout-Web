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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "financial";
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["financial"]));
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
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
          <div className="space-y-1">
            {reportTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isExpanded = expandedItems.has(tab.id);
              
              return (
                <div key={tab.id} className="relative">
                  <button
                    onClick={() => {
                      setActiveTab(tab.id);
                      toggleExpanded(tab.id);
                    }}
                    onMouseEnter={() => setHoveredItem(tab.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left group",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon className="h-4 w-4" />
                      <div>
                        <div>{tab.name}</div>
                        <div className="text-xs opacity-75">{tab.description}</div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                    ) : (
                      <ChevronRight className="h-4 w-4 transition-transform duration-200" />
                    )}
                  </button>

                  {/* Expandable Sub-items */}
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 animate-accordion-down">
                      {tab.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-xs transition-all duration-200 text-left hover:bg-accent hover:text-foreground text-muted-foreground"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5 opacity-60" />
                          <div>
                            <div className="font-medium">{subItem.name}</div>
                            <div className="text-xs opacity-70">{subItem.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hover Tooltip */}
                  {hoveredItem === tab.id && !isExpanded && (
                    <div className="absolute left-full top-0 ml-2 z-50 animate-fade-in">
                      <Card className="w-64 shadow-lg border-border bg-popover">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <tab.icon className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-foreground">{tab.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{tab.description}</p>
                          <div className="space-y-2">
                            {tab.subItems.map((subItem) => (
                              <div key={subItem.id} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                                <div>
                                  <div className="text-sm font-medium text-foreground">{subItem.name}</div>
                                  <div className="text-xs text-muted-foreground">{subItem.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
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