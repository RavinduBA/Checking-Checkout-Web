import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  MapPin, 
  Bed, 
  Users, 
  UserCheck, 
  Percent,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import LocationsTab from "@/components/master-files/LocationsTab";
import RoomsTab from "@/components/master-files/RoomsTab";
import GuidesTab from "@/components/master-files/GuidesTab";
import AgentsTab from "@/components/master-files/AgentsTab";
import CommissionsTab from "@/components/master-files/CommissionsTab";

const masterFilesTabs = [
  { 
    id: "locations", 
    name: "Hotel Locations", 
    icon: MapPin, 
    description: "Manage hotel locations",
    subItems: [
      { id: "active", name: "Active Locations", description: "Currently operational locations" },
      { id: "inactive", name: "Inactive Locations", description: "Temporarily closed locations" },
      { id: "add", name: "Add Location", description: "Create new hotel location" }
    ]
  },
  { 
    id: "rooms", 
    name: "Room Management", 
    icon: Bed, 
    description: "Manage hotel rooms",
    subItems: [
      { id: "all", name: "All Rooms", description: "View all hotel rooms" },
      { id: "types", name: "Room Types", description: "Manage room categories" },
      { id: "pricing", name: "Room Pricing", description: "Set room rates" },
      { id: "amenities", name: "Amenities", description: "Room features & facilities" }
    ]
  },
  { 
    id: "guides", 
    name: "Tour Guides", 
    icon: UserCheck, 
    description: "Manage tour guides",
    subItems: [
      { id: "active", name: "Active Guides", description: "Currently available guides" },
      { id: "inactive", name: "Inactive Guides", description: "Temporarily unavailable" },
      { id: "licenses", name: "License Management", description: "Guide license tracking" },
      { id: "performance", name: "Performance", description: "Guide ratings & reviews" }
    ]
  },
  { 
    id: "agents", 
    name: "Travel Agents", 
    icon: Users, 
    description: "Manage travel agents",
    subItems: [
      { id: "active", name: "Active Agents", description: "Current agent partners" },
      { id: "agencies", name: "Travel Agencies", description: "Agency partnerships" },
      { id: "contracts", name: "Contracts", description: "Agent agreements" },
      { id: "performance", name: "Performance", description: "Agent booking statistics" }
    ]
  },
  { 
    id: "commissions", 
    name: "Commission Settings", 
    icon: Percent, 
    description: "Commission configuration",
    subItems: [
      { id: "rates", name: "Commission Rates", description: "Default commission percentages" },
      { id: "tiers", name: "Tier Structure", description: "Performance-based tiers" },
      { id: "payments", name: "Payment Schedule", description: "Commission payment terms" },
      { id: "rules", name: "Calculation Rules", description: "Commission calculation logic" }
    ]
  },
];

export default function MasterFiles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "locations";
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["locations"]));
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
      case "locations":
        return <LocationsTab />;
      case "rooms":
        return <RoomsTab />;
      case "guides":
        return <GuidesTab />;
      case "agents":
        return <AgentsTab />;
      case "commissions":
        return <CommissionsTab />;
      default:
        return <LocationsTab />;
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Master Files</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            System configurations
          </p>
        </div>
        
        <nav className="p-4">
          <div className="space-y-1">
            {masterFilesTabs.map((tab) => {
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
                          className="w-full flex items-start gap-2 px-3 py-2 rounded-md text-xs transition-all duration-200 text-left hover:bg-accent hover:text-foreground text-muted-foreground hover-scale"
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
                              <div key={subItem.id} className="flex items-start gap-2 hover-scale">
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
      <div className="flex-1 p-6">
        <Card className="h-full">
          <CardContent className="p-6 h-full">
            {renderTabContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}