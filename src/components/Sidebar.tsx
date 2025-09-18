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
  DollarSign,
  ChevronDown,
  ChevronRight,
  Wifi
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import checkinLogo from "@/assets/checkin-checkout-logo.png";
import { usePermissions } from "@/hooks/usePermissions";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const getNavigationItems = (hasAnyPermission: (perm: string) => boolean) => [
  { name: "Dashboard", href: "/app", icon: Home, permission: "dashboard" },
  { name: "Calendar", href: "/app/calendar", icon: Calendar, permission: "calendar" },
  { name: "Channel Manager", href: "/app/beds24", icon: Wifi, permission: "beds24" },
  { 
    name: "Master Files", 
    href: "/app/master-files", 
    icon: FolderOpen,
    permission: "master_files",
    subItems: [
      { name: "Hotel Locations", href: "/app/master-files?tab=locations", icon: MapPin, description: "Manage hotel locations" },
      { name: "Room Management", href: "/app/master-files?tab=rooms", icon: Bed, description: "Manage hotel rooms" },
      { name: "Tour Guides", href: "/app/master-files?tab=guides", icon: UserCheck, description: "Manage tour guides" },
      { name: "Travel Agents", href: "/app/master-files?tab=agents", icon: Users, description: "Manage travel agents" },
      { name: "Commission Settings", href: "/app/master-files?tab=commissions", icon: Percent, description: "Commission configuration" }
    ]
  },
  { name: "Room Management", href: "/app/rooms", icon: Bed, permission: "rooms" },
  { name: "Reservations", href: "/app/income", icon: PlusCircle, permission: "income" },
  { name: "Add Expense", href: "/app/expense", icon: MinusCircle, permission: "expenses" },
  { 
    name: "Reports", 
    href: "/app/reports", 
    icon: BarChart3,
    permission: "reports",
    subItems: [
      { name: "Financial Reports", href: "/app/reports?tab=financial", icon: BarChart3, description: "Revenue and expense analysis" },
      { name: "Accounts Reports", href: "/app/reports?tab=accounts", icon: CreditCard, description: "Account balances and transactions" },
      { name: "Commission Reports", href: "/app/reports?tab=commission", icon: Percent, description: "Guide and agent commissions" },
      { name: "Occupancy Reports", href: "/app/reports?tab=occupancy", icon: Building2, description: "Room occupancy analysis" },
      { name: "Trend Analysis", href: "/app/reports?tab=trends", icon: TrendingUp, description: "Performance trends" }
    ]
  },
  { name: "Accounts", href: "/app/accounts", icon: Building2, permission: "accounts" },
  { name: "Users", href: "/app/users", icon: Users, permission: "users" },
  { name: "Settings", href: "/app/settings", icon: Settings, permission: "settings" },
].filter(item => !item.permission || hasAnyPermission(item.permission));

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { hasAnyPermission, loading } = usePermissions();

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const isExpanded = (itemName: string) => expandedItems.includes(itemName);

  if (loading) {
    return (
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-card border-r border-border shadow-elegant items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const navigation = getNavigationItems(hasAnyPermission);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-card border-r border-border shadow-elegant">
          {/* Logo */}
            <div className="flex items-center gap-3 mb-4">
              <img src={checkinLogo} alt="CHECK-IN CHECK-OUT" className="w-10 h-10 rounded-lg" />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-lg">CHECK-IN</span>
                <span className="font-normal text-lg">CHECK-OUT</span>
              </div>
            </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.subItems && item.subItems.some(sub => location.pathname + location.search === sub.href));
              const itemExpanded = isExpanded(item.name);
              
              return (
                <div key={item.name}>
                  {/* Main Item */}
                  <div
                    onClick={() => item.subItems ? toggleExpanded(item.name) : null}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <Link to={item.href} className="flex-1">
                      {item.name}
                    </Link>
                    {item.subItems && (
                      itemExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                    )}
                  </div>

                  {/* Sub Items */}
                  {item.subItems && itemExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const subIsActive = location.pathname + location.search === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                              subIsActive
                                ? "bg-accent text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        );
                      })}
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
          <div className="flex items-center gap-3 px-6 py-6 border-b border-border">
            <img src={checkinLogo} alt="CHECK-IN CHECK-OUT" className="w-10 h-10 rounded-lg" />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-lg">CHECK-IN</span>
              <span className="font-normal text-lg">CHECK-OUT</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                             (item.subItems && item.subItems.some(sub => location.pathname + location.search === sub.href));
              const itemExpanded = isExpanded(item.name);
              
              return (
                <div key={item.name}>
                  {/* Main Item */}
                  <div
                    onClick={() => item.subItems ? toggleExpanded(item.name) : null}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      isActive
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <Link to={item.href} className="flex-1" onClick={item.subItems ? undefined : onClose}>
                      {item.name}
                    </Link>
                    {item.subItems && (
                      itemExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                    )}
                  </div>

                  {/* Sub Items */}
                  {item.subItems && itemExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const subIsActive = location.pathname + location.search === subItem.href;
                        return (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            onClick={onClose}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
                              subIsActive
                                ? "bg-accent text-primary font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                          >
                            <subItem.icon className="h-4 w-4" />
                            {subItem.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}