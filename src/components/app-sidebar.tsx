import * as React from "react"
import {
  Home,
  Calendar,
  Wifi,
  FolderOpen,
  PlusCircle,
  MinusCircle,
  BarChart3,
  Building2,
  Users,
  Settings,
  MapPin,
  Bed,
  UserCheck,
  Percent,
  TrendingUp,
  CreditCard,
  DollarSign,
  Building,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { LocationSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/AuthContext"
import { useProfile } from "@/hooks/useProfile"
import { usePermissions } from "@/hooks/usePermissions"
import { useLocation } from "react-router-dom"
import checkinLogo from "@/assets/checkin-checkout-logo.png"

interface Location {
  id: string
  name: string
  is_active: boolean
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  locations?: Location[]
  selectedLocation?: string
  onLocationChange?: (locationId: string) => void
  locationsLoading?: boolean
}

export function AppSidebar({ 
  locations = [], 
  selectedLocation = "all", 
  onLocationChange = () => {}, 
  locationsLoading = false,
  ...props 
}: AppSidebarProps) {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { hasAnyPermission } = usePermissions()
  const location = useLocation()

  // Main navigation items based on user permissions
  const getNavMainItems = () => {
    const items = []

    // Core features
    if (hasAnyPermission("dashboard")) {
      items.push({
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
        isActive: location.pathname === "/dashboard"
      })
    }

    if (hasAnyPermission("calendar")) {
      items.push({
        title: "Calendar",
        url: "/calendar", 
        icon: Calendar,
        isActive: location.pathname === "/calendar"
      })
    }

    if (hasAnyPermission("booking_channels")) {
      items.push({
        title: "Booking Channels",
        url: "/booking-channels",
        icon: Wifi,
        isActive: location.pathname === "/booking-channels"
      })
    }

    // Master Files with sub-items
    if (hasAnyPermission("master_files")) {
      items.push({
        title: "Master Files",
        url: "/master-files",
        icon: FolderOpen,
        isActive: location.pathname === "/master-files",
        items: [
          { title: "Hotel Locations", url: "/master-files?tab=locations" },
          { title: "Rooms", url: "/master-files?tab=rooms" },
          { title: "Tour Guides", url: "/master-files?tab=guides" },
          { title: "Travel Agents", url: "/master-files?tab=agents" },
          { title: "Commission Settings", url: "/master-files?tab=commissions" }
        ]
      })
    }

    // Reports with sub-items
    if (hasAnyPermission("reports")) {
      items.push({
        title: "Reports",
        url: "/reports?tab=comprehensive",
        icon: BarChart3,
        isActive: location.pathname === "/reports",
      })
    }

    return items
  }

  // Quick action projects
  const getProjectItems = () => {
    const projects = []

    if (hasAnyPermission("income")) {
      projects.push({
        name: "Reservations",
        url: "/reservations",
        icon: PlusCircle
      })
    }

    if (hasAnyPermission("expenses")) {
      projects.push({
        name: "Add Expense", 
        url: "/expense",
        icon: MinusCircle
      })
    }

    if (hasAnyPermission("accounts")) {
      projects.push({
        name: "Accounts",
        url: "/accounts", 
        icon: Building2
      })
    }

    return projects
  }

  const userData = {
    name: profile?.name || user?.email?.split('@')[0] || "User",
    email: user?.email || "",
    avatar: "/placeholder.svg"
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <LocationSwitcher 
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationChange={onLocationChange}
          loading={locationsLoading}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getNavMainItems()} />
        <NavProjects projects={getProjectItems()} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
