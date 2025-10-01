import {
	BarChart3,
	Bed,
	Building,
	Building2,
	Calendar,
	CreditCard,
	DollarSign,
	FolderOpen,
	Home,
	MapPin,
	MinusCircle,
	Percent,
	Phone,
	PlusCircle,
	Settings,
	TrendingUp,
	UserCheck,
	Users,
	Wifi,
} from "lucide-react";
import * as React from "react";
import { useLocation } from "react-router";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { LocationSwitcher } from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";

interface Location {
	id: string;
	name: string;
	is_active: boolean;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
	locations?: Location[];
	selectedLocation?: string;
	onLocationChange?: (locationId: string) => void;
	locationsLoading?: boolean;
}

export function AppSidebar({
	locations = [],
	selectedLocation = "all",
	onLocationChange,
	locationsLoading = false,
	...props
}: AppSidebarProps) {
	const { user } = useAuth();
	const { profile } = useProfile();
	const { hasAnyPermission, permissions, loading } = usePermissions();
	const location = useLocation();

	// Handle location change with permission check
	const handleLocationChange = React.useCallback(
		(locationId: string) => {
			// Call the parent's onLocationChange if provided
			if (onLocationChange) {
				onLocationChange(locationId);
			}

			// Note: Permissions are automatically refreshed when location context changes
			// The sidebar will re-render with updated navigation items based on new permissions
		},
		[onLocationChange],
	);

	// Main navigation items based on user permissions
	const getNavMainItems = () => {
		const items = [];

		// Core features
		if (hasAnyPermission(["access_dashboard"])) {
			items.push({
				title: "Dashboard",
				url: "/dashboard",
				icon: Home,
				isActive: location.pathname === "/dashboard",
			});
		}

		if (hasAnyPermission(["access_calendar"])) {
			items.push({
				title: "Calendar",
				url: "/calendar",
				icon: Calendar,
				isActive: location.pathname === "/calendar",
			});
		}

		// Reservations/Bookings
		if (hasAnyPermission(["access_bookings"])) {
			items.push({
				title: "Reservations",
				url: "/reservations",
				icon: Building,
				isActive:
					location.pathname === "/reservations" ||
					location.pathname.startsWith("/reservations/"),
			});
		}

		// Income/Payments
		if (hasAnyPermission(["access_income"])) {
			items.push({
				title: "Income & Payments",
				url: "/income",
				icon: DollarSign,
				isActive: location.pathname === "/income",
			});
		}

		// Expenses
		if (hasAnyPermission(["access_expenses"])) {
			items.push({
				title: "Expenses",
				url: "/expense",
				icon: CreditCard,
				isActive: location.pathname === "/expense",
			});
		}

		// Accounts
		if (hasAnyPermission(["access_accounts"])) {
			items.push({
				title: "Accounts",
				url: "/accounts",
				icon: Building2,
				isActive: location.pathname === "/accounts",
			});
		}

		if (hasAnyPermission(["access_booking_channels"])) {
			items.push({
				title: "Booking Channels",
				url: "/booking-channels",
				icon: Wifi,
				isActive: location.pathname === "/booking-channels",
			});
		}

		// Master Files with sub-items
		if (hasAnyPermission(["access_master_files"])) {
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
					{
						title: "Commission Settings",
						url: "/master-files?tab=commissions",
					},
				],
			});
		}

		// Reports with sub-items
		if (hasAnyPermission(["access_reports"])) {
			items.push({
				title: "Reports",
				url: "/reports?tab=comprehensive",
				icon: BarChart3,
				isActive: location.pathname === "/reports",
			});
		}

		if (hasAnyPermission(["access_users"])) {
			items.push({
				title: "Users",
				url: "/users",
				icon: Users,
				isActive: location.pathname === "/users",
			});
		}

		if (hasAnyPermission(["access_settings"])) {
			items.push({
				title: "Settings",
				url: "/settings",
				icon: Settings,
				isActive: location.pathname === "/settings",
			});
		}

		// Billing - always show for SaaS tenants
		items.push({
			title: "Billing & Subscription",
			url: "/billing",
			icon: CreditCard,
			isActive: location.pathname.startsWith("/billing"),
		});

		return items;
	};

	// Quick action projects
	const getProjectItems = () => {
		const projects = [];

		if (hasAnyPermission(["access_bookings"])) {
			projects.push({
				name: "New Reservation",
				url: "/reservations/new",
				icon: PlusCircle,
			});
		}

		if (hasAnyPermission(["access_income"])) {
			projects.push({
				name: "New Payment",
				url: "/payments/new",
				icon: DollarSign,
			});
		}

		if (hasAnyPermission(["access_expenses"])) {
			projects.push({
				name: "Add Expense",
				url: "/expense",
				icon: MinusCircle,
			});
		}

		// Phone verification quick action - show for all users
		if (profile && !profile.is_phone_verified) {
			projects.push({
				name: "Verify Phone",
				url: "/settings?tab=profile",
				icon: Phone,
			});
		}

		return projects;
	};

	const userData = {
		name: profile?.name || user?.email?.split("@")[0] || "User",
		email: user?.email || "",
		avatar: "/placeholder.svg",
	};

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<LocationSwitcher
					locations={locations}
					selectedLocation={selectedLocation}
					onLocationChange={handleLocationChange}
					loading={locationsLoading}
				/>
			</SidebarHeader>
			<SidebarContent>
				{loading ? (
					<div className="p-4 text-sm text-muted-foreground">
						Loading navigation...
					</div>
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
	);
}
