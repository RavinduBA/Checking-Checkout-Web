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
import LanguageDropdown from "./dropdown-language";
import { Button } from "./ui/button";
import { LanguagesIcon } from "lucide-react";
import ProfileDropdown from "./dropdown-profile";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ThemeSwitcher from "./ThemeSwitcher";
import FullscreenToggle from "./FullscreenToggle";

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
				<header className='bg-card sticky w-full top-0 z-50 border-b'>
					<div className='mx-auto flex w-full items-center justify-between gap-6 px-4 py-2 sm:px-6'>
						<div className="flex items-center gap-2 px-0 sm:px-2">
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
						<div className='flex items-center gap-1.5'>
							<FullscreenToggle />
							<ThemeSwitcher />
							<LanguageDropdown
								trigger={
									<Button variant='ghost' size='icon'>
										<LanguagesIcon />
									</Button>
								}
							/>
							<ProfileDropdown
								trigger={
									<Button variant='ghost' size='icon' className='size-9.5'>
										<Avatar className='size-9.5 rounded-md'>
											<AvatarImage src='https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-1.png' />
											<AvatarFallback>JD</AvatarFallback>
										</Avatar>
									</Button>
								}
							/>
						</div>
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
