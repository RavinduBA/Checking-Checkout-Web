import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  Home, 
  CreditCard, 
  PlusCircle, 
  MinusCircle, 
  ArrowLeftRight, 
  BarChart3, 
  Calendar,
  Building2,
  Users,
  Settings,
  Bed,
  FolderOpen,
  MapPin,
  UserCheck,
  Percent,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { 
    name: "Master Files", 
    href: "/master-files", 
    icon: FolderOpen,
    subItems: [
      { name: "Hotel Locations", href: "/master-files?tab=locations", icon: MapPin, description: "Manage hotel locations" },
      { name: "Room Management", href: "/master-files?tab=rooms", icon: Bed, description: "Manage hotel rooms" },
      { name: "Tour Guides", href: "/master-files?tab=guides", icon: UserCheck, description: "Manage tour guides" },
      { name: "Travel Agents", href: "/master-files?tab=agents", icon: Users, description: "Manage travel agents" },
      { name: "Commission Settings", href: "/master-files?tab=commissions", icon: Percent, description: "Commission configuration" }
    ]
  },
  { name: "Room Management", href: "/rooms", icon: Bed },
  { name: "Reservations", href: "/income", icon: PlusCircle },
  { name: "Add Expense", href: "/expense", icon: MinusCircle },
  { 
    name: "Reports", 
    href: "/reports", 
    icon: BarChart3,
    subItems: [
      { name: "Financial Reports", href: "/reports?tab=financial", icon: BarChart3, description: "Revenue and expense analysis" },
      { name: "Accounts Reports", href: "/reports?tab=accounts", icon: CreditCard, description: "Account balances and transactions" },
      { name: "Commission Reports", href: "/reports?tab=commission", icon: Percent, description: "Guide and agent commissions" },
      { name: "Occupancy Reports", href: "/reports?tab=occupancy", icon: Building2, description: "Room occupancy analysis" },
      { name: "Trend Analysis", href: "/reports?tab=trends", icon: TrendingUp, description: "Performance trends" }
    ]
  },
  { name: "Accounts", href: "/accounts", icon: Building2 },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-card border-r border-border shadow-elegant">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-6 border-b border-border">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Hotel Manager</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.subItems && item.subItems.some(sub => location.pathname + location.search === sub.href));
              return (
                <div key={item.name} className="relative">
                  <Link
                    to={item.href}
                    onMouseEnter={() => setHoveredItem(item.name)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>

                  {/* Hover Sub-menu */}
                  {hoveredItem === item.name && item.subItems && (
                    <div className="absolute left-full top-0 ml-2 z-50 animate-fade-in">
                      <Card className="w-72 shadow-elegant border-border bg-popover">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <item.icon className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold text-foreground">{item.name}</h4>
                          </div>
                          <div className="space-y-1">
                            {item.subItems.map((subItem) => (
                              <Link
                                key={subItem.name}
                                to={subItem.href}
                                className="flex items-start gap-3 p-2 rounded-md text-sm transition-all duration-200 hover:bg-accent hover:text-foreground text-muted-foreground hover-scale"
                              >
                                <subItem.icon className="h-4 w-4 mt-0.5 text-primary" />
                                <div>
                                  <div className="font-medium text-foreground">{subItem.name}</div>
                                  <div className="text-xs opacity-70">{subItem.description}</div>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-elegant transform transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 px-6 py-6 border-b border-border">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Hotel Manager</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.subItems && item.subItems.some(sub => location.pathname + location.search === sub.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}