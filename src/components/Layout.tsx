import { Outlet, useLocation } from "react-router";
import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useLocationContext } from "@/context/LocationContext";
import { useIsMobile } from "@/hooks/use-mobile";

export function Layout() {
	const { selectedLocation, setSelectedLocation, locations, loading } =
		useLocationContext();
	const isMobile = useIsMobile();
	const location = useLocation();

	// Get page title based on current route
	const getPageTitle = () => {
		const path = location.pathname;
		const searchParams = new URLSearchParams(location.search);

		switch (path) {
			case "/dashboard":
				return "Dashboard";
			case "/calendar":
				return "Calendar";
			case "/reservations":
				return "Reservations";
			case "/reservations/new":
				return "New Reservation";
			case "/reservations/compact":
				return "Quick Booking";
			case "/income":
				return "Reservations & Payments";
			case "/expense":
				return "Add Expense";
			case "/accounts":
				return "Accounts";
			case "/payments/new":
				return "Payment Form";
			case "/reports": {
				const tab = searchParams.get("tab");
				switch (tab) {
					case "comprehensive":
						return "Comprehensive Reports";
					case "accounts":
						return "Account Reports";
					case "commission":
						return "Commission Reports";
					case "balance":
						return "Balance Sheet";
					case "enhanced":
						return "Enhanced Financial Reports";
					default:
						return "Financial Reports";
				}
			}
			case "/financial-reports":
				return "Reports & Analytics";
			case "/users":
				return "User Management";
			case "/settings":
				return "Settings";
			case "/master-files": {
				const masterTab = searchParams.get("tab");
				switch (masterTab) {
					case "locations":
						return "Master Files - Locations";
					case "rooms":
						return "Master Files - Rooms";
					case "guides":
						return "Master Files - Guides";
					case "agents":
						return "Master Files - Agents";
					case "commissions":
						return "Master Files - Commissions";
					default:
						return "Master Files";
				}
			}
			case "/room-management":
				return "Room Management";
			case "/booking-channels":
				return "Booking Channels";
			default:
				if (path.startsWith("/reservations/")) {
					return "Reservation Details";
				}
				return "Hotel Management";
		}
	};

	return (
		<SidebarProvider>
			<AppSidebar
				locations={locations}
				selectedLocation={selectedLocation}
				onLocationChange={setSelectedLocation}
				locationsLoading={loading}
			/>
			<SidebarInset>
				{/* Header */}
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="/dashboard">
										<span className="text-black">CheckingCheckout</span>
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage className="text-black text-md font-normal">
										{getPageTitle()}
									</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>

				{/* Main Content */}
				<div className="flex flex-1 flex-col gap-4 px-0 sm:px-4 pt-0">
					<Outlet />
				</div>
			</SidebarInset>

			{/* Mobile Bottom Navigation */}
			{isMobile && <MobileBottomNav />}
		</SidebarProvider>
	);
}
