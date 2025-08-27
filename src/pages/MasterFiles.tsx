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
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "locations";

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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Master Files</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          System configurations and master data management
        </p>
      </div>
      
      <Card className="h-full">
        <CardContent className="p-6">
          {renderTabContent()}
        </CardContent>
      </Card>
    </div>
  );
}