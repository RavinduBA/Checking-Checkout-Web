import * as React from "react"
import { ChevronsUpDown, MapPin, Building2 } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { InlineLoader } from "@/components/ui/loading-spinner"
import Logo from "./ui/logo"

interface Location {
  id: string
  name: string
  is_active: boolean
}

export function LocationSwitcher({
  locations,
  selectedLocation,
  onLocationChange,
  loading = false,
}: {
  locations: Location[]
  selectedLocation: string
  onLocationChange: (locationId: string) => void
  loading?: boolean
}) {
  const { isMobile } = useSidebar()
  
  const activeLocation = selectedLocation === "all" 
    ? { id: "all", name: "All Locations", is_active: true }
    : locations.find(loc => loc.id === selectedLocation) || { id: "all", name: "All Locations", is_active: true }

  const getLocationDisplayName = (location: typeof activeLocation) => {
    if (location.id === "all") return "All Locations"
    return location.name
  }

  const getLocationSubtext = (location: typeof activeLocation) => {
    if (location.id === "all") {
      return `${locations.length} location${locations.length !== 1 ? 's' : ''}`
    }
    return "Active Location"
  }

  if (loading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <InlineLoader />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                {activeLocation.id === "all" ? (
                  <Logo  />
                ) : (
                  <MapPin className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {getLocationDisplayName(activeLocation)}
                </span>
                <span className="truncate text-xs">{getLocationSubtext(activeLocation)}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Locations
            </DropdownMenuLabel>
            
            {/* All Locations Option */}
            <DropdownMenuItem
              onClick={() => onLocationChange("all")}
              className="gap-2 p-2"
            >
              <div className="flex size-6 items-center justify-center rounded-sm border">
                <Logo />
              </div>
              All Locations
              <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Individual Locations */}
            {locations.map((location, index) => (
              <DropdownMenuItem
                key={location.id}
                onClick={() => onLocationChange(location.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <MapPin className="size-4 shrink-0" />
                </div>
                {location.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            
            {locations.length === 0 && (
              <DropdownMenuItem disabled className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-sm border bg-muted">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="font-medium text-muted-foreground">No locations available</div>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
