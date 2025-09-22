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
  const { hasAnyPermission, permissions, loading } = usePermissions()
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

    // Reservations/Bookings
    if (hasAnyPermission("bookings")) {
      items.push({
        title: "Reservations",
        url: "/reservations",
        icon: Building,
        isActive: location.pathname === "/reservations" || location.pathname.startsWith("/reservations/")
      })
    }

    // Income/Payments
    if (hasAnyPermission("income")) {
      items.push({
        title: "Income & Payments",
        url: "/income",
        icon: DollarSign,
        isActive: location.pathname === "/income"
      })
    }

    // Expenses
    if (hasAnyPermission("expenses")) {
      items.push({
        title: "Expenses",
        url: "/expense",
        icon: CreditCard,
        isActive: location.pathname === "/expense"
      })
    }

    // Accounts
    if (hasAnyPermission("accounts")) {
      items.push({
        title: "Accounts",
        url: "/accounts",
        icon: Building2,
        isActive: location.pathname === "/accounts"
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

    // Admin features
    if (hasAnyPermission("rooms")) {
      items.push({
        title: "Room Management",
        url: "/rooms",
        icon: Bed,
        isActive: location.pathname === "/rooms"
      })
    }

    if (hasAnyPermission("users")) {
      items.push({
        title: "Users",
        url: "/users",
        icon: Users,
        isActive: location.pathname === "/users"
      })
    }

    if (hasAnyPermission("settings")) {
      items.push({
        title: "Settings",
        url: "/settings",
        icon: Settings,
        isActive: location.pathname === "/settings"
      })
    }

    return items
  }

  // Quick action projects
  const getProjectItems = () => {
    const projects = []

    if (hasAnyPermission("bookings")) {
      projects.push({
        name: "New Reservation",
        url: "/reservations/new",
        icon: PlusCircle
      })
    }

    if (hasAnyPermission("income")) {
      projects.push({
        name: "New Payment",
        url: "/payments/new",
        icon: DollarSign
      })
    }

    if (hasAnyPermission("expenses")) {
      projects.push({
        name: "Add Expense", 
        url: "/expense",
        icon: MinusCircle
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
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading navigation...</div>
        ) : (
          <>
            <NavMain items={getNavMainItems()} />
            <NavProjects projects={getProjectItems()} />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
