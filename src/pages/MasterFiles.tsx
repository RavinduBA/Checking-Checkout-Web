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
  Percent 
} from "lucide-react";
import LocationsTab from "@/components/master-files/LocationsTab";
import RoomsTab from "@/components/master-files/RoomsTab";
import GuidesTab from "@/components/master-files/GuidesTab";
import AgentsTab from "@/components/master-files/AgentsTab";
import CommissionsTab from "@/components/master-files/CommissionsTab";

const masterFilesTabs = [
  { 
    id: "locations", 
    name: "Locations", 
    icon: MapPin, 
    description: "Manage hotel locations" 
  },
  { 
    id: "rooms", 
    name: "Rooms", 
    icon: Bed, 
    description: "Manage hotel rooms" 
  },
  { 
    id: "guides", 
    name: "Guides", 
    icon: UserCheck, 
    description: "Manage tour guides" 
  },
  { 
    id: "agents", 
    name: "Agents", 
    icon: Users, 
    description: "Manage travel agents" 
  },
  { 
    id: "commissions", 
    name: "Commissions", 
    icon: Percent, 
    description: "Commission settings" 
  },
];

export default function MasterFiles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "locations";

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
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
            Manage system configurations
          </p>
        </div>
        
        <nav className="p-4">
          <div className="space-y-2">
            {masterFilesTabs.map((tab) => {
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