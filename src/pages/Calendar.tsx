import { format } from "date-fns";
import {
	ArrowLeft,
	Calendar as CalendarIcon,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Eye,
	Filter,
	Grid3X3,
	List,
	MapPin,
	Plus,
	RefreshCw,
	Users,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { CalendarSkeleton } from "@/components/CalendarSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useCalendarData } from "@/hooks/useCalendarData";
import { Tables } from "@/integrations/supabase/types";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};

type Room = Tables<"rooms">;
type Location = Tables<"locations">;

interface ExternalBooking {
	id: string;
	external_id: string;
	property_id: string;
	source: string;
	guest_name: string;
	check_in: string;
	check_out: string;
	status: string;
	total_amount: number | null;
	currency: string;
	location_id: string | null;
	room_name: string | null;
	adults: number;
	children: number;
	created_at: string;
	last_synced_at: string | null;
	raw_data?: any;
	location?: {
		name: string;
	};
	mappedLocation?: Location | null;
}

interface VirtualRoom extends Room {
	isVirtual?: boolean;
	virtualRoomName?: string;
}

interface PropertyMapping {
	locationId: string;
	locationName: string;
	channelProperties: string[];
}

export default function Calendar() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { t, i18n } = useTranslation();

	// Use the custom hook for calendar data
	const {
		reservations,
		externalBookings,
		rooms,
		locations,
		propertyMappings,
		loading,
		refetch,
	} = useCalendarData();

	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedBooking, setSelectedBooking] =
		useState<ExternalBooking | null>(null);
	const [showBookingDialog, setShowBookingDialog] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] = useState(false);

	const { selectedLocation } = useLocationContext();
	const locale = i18n.language || "en";

	const formatDate = useCallback(
		(date: Date, options: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat(locale, options).format(date),
		[locale],
	);

	const getInternalStatusLabel = useCallback(
		(status?: string) => {
			switch ((status || "").toLowerCase()) {
				case "confirmed":
					return t("calendar.legend.internalConfirmed");
				case "tentative":
					return t("calendar.legend.internalTentative");
				case "cancelled":
					return t("calendar.legend.cancelled");
				default:
					return status || "";
			}
		},
		[t],
	);

	const getExternalStatusLabel = useCallback(
		(status?: string) => {
			switch ((status || "").toLowerCase()) {
				case "confirmed":
					return t("calendar.legend.externalConfirmed");
				case "new":
					return t("calendar.legend.externalNew");
				case "cancelled":
					return t("calendar.legend.cancelled");
				default:
					return status || "";
			}
		},
		[t],
	);

	// Helper function to get location from external booking based on property mappings
	const getLocationFromExternalBooking = (
		booking: ExternalBooking,
	): Location | null => {
		// Special handling for "Room 609309" - force to first location that contains "rusty"
		if (booking.room_name && booking.room_name.includes("Room 609309")) {
			return (
				locations.find((loc) => loc.name.toLowerCase().includes("rusty")) ||
				null
			);
		}

		const possiblePropertyNames = [
			booking.raw_data?.propertyName,
			booking.room_name,
			booking.raw_data?.roomName,
			booking.raw_data?.referer,
		].filter(Boolean);

		for (const mapping of propertyMappings) {
			for (const propertyName of possiblePropertyNames) {
				if (
					propertyName &&
					mapping.channelProperties.some(
						(prop) =>
							propertyName.includes(prop) ||
							prop.includes(propertyName) ||
							prop === propertyName,
					)
				) {
					return locations.find((loc) => loc.id === mapping.locationId) || null;
				}
			}
		}

		if (booking.location) {
			return (
				locations.find((loc) => loc.name === booking.location?.name) || null
			);
		}

		return null;
	};

	const filteredRooms = rooms.filter(
		(room) => !selectedLocation || room.location_id === selectedLocation,
	);

	const filteredReservations = reservations.filter(
		(reservation) =>
			!selectedLocation || reservation.location_id === selectedLocation,
	);

	const filteredExternalBookings = externalBookings
		.map((booking) => ({
			...booking,
			mappedLocation: getLocationFromExternalBooking(booking),
		}))
		.filter(
			(booking) =>
				!selectedLocation || booking.mappedLocation?.id === selectedLocation,
		);

	// Create virtual rooms for external bookings when no internal rooms exist for a location
	const getVirtualRoomsForExternalBookings = (): VirtualRoom[] => {
		const virtualRooms: VirtualRoom[] = [];

		// Group external bookings by room name and location
		const externalRoomGroups = new Map<string, ExternalBooking[]>();

		filteredExternalBookings.forEach((booking) => {
			const roomKey = `${booking.mappedLocation?.id || "unknown"}-${booking.room_name || "Unknown Room"}`;
			if (!externalRoomGroups.has(roomKey)) {
				externalRoomGroups.set(roomKey, []);
			}
			externalRoomGroups.get(roomKey)!.push(booking);
		});

		// Create virtual rooms for locations that have external bookings but no internal rooms
		externalRoomGroups.forEach((bookings, roomKey) => {
			const firstBooking = bookings[0];
			const locationId = firstBooking.mappedLocation?.id;

			if (
				locationId &&
				!filteredRooms.some((room) => room.location_id === locationId)
			) {
				virtualRooms.push({
					id: `virtual-${roomKey}`,
					tenant_id: tenant?.id || "",
					location_id: locationId,
					room_number: firstBooking.room_name || "External Room",
					room_type: firstBooking.raw_data?.channel || "External",
					bed_type: "Various",
					max_occupancy: Math.max(
						...bookings.map((b) => b.adults + b.children),
					),
					base_price: 0,
					description: `External bookings from ${firstBooking.raw_data?.apiSource || firstBooking.source}`,
					amenities: [],
					is_active: true,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
					currency: "LKR" as const,
					property_type: "Room", // Add the missing property
					isVirtual: true,
					virtualRoomName: firstBooking.room_name || "External Room",
				});
			}
		});

		return virtualRooms;
	};

	const virtualRooms = getVirtualRoomsForExternalBookings();
	const allDisplayRooms: VirtualRoom[] = [...filteredRooms, ...virtualRooms];

	const getStatusColor = (status: string, isExternal = false) => {
		if (isExternal) {
			const colors = {
				confirmed: "bg-purple-100 text-purple-800 border-purple-200",
				new: "bg-indigo-100 text-indigo-800 border-indigo-200",
				cancelled: "bg-red-100 text-red-800 border-red-200",
			};
			return (
				colors[status as keyof typeof colors] ||
				"bg-gray-100 text-gray-800 border-gray-200"
			);
		}

		const colors = {
			confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
			tentative: "bg-amber-100 text-amber-800 border-amber-200",
			completed: "bg-blue-100 text-blue-800 border-blue-200",
			cancelled: "bg-red-100 text-red-800 border-red-200",
		};
		return (
			colors[status as keyof typeof colors] ||
			"bg-gray-100 text-gray-800 border-gray-200"
		);
	};

	const getRoomStatus = (room: Room) => {
		// Simple room status logic - can be enhanced
		return "Ready";
	};

	// Generate dates for calendar header
	const generateCalendarDates = () => {
		const year = currentDate.getFullYear();
		const month = currentDate.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		const dates = [];
		for (let day = 1; day <= daysInMonth; day++) {
			dates.push(new Date(year, month, day));
		}
		return dates;
	};

	// Get reservations and external bookings for a specific room and date
	const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
		const internalReservations = filteredReservations.filter((reservation) => {
			const checkIn = new Date(reservation.check_in_date);
			const checkOut = new Date(reservation.check_out_date);
			return (
				date >= checkIn && date < checkOut && reservation.room_id === roomId
			);
		});

		// For external bookings, we need to match by location and room name
		const room = allDisplayRooms.find((r) => r.id === roomId);
		const externalReservations = filteredExternalBookings
			.filter((booking) => {
				const checkIn = new Date(booking.check_in);
				const checkOut = new Date(booking.check_out);

				// For virtual rooms, match by room name and location
				if (room?.isVirtual) {
					const matchesRoomName = booking.room_name === room.virtualRoomName;
					const matchesLocation =
						booking.mappedLocation?.id === room.location_id;
					return (
						date >= checkIn &&
						date < checkOut &&
						matchesRoomName &&
						matchesLocation
					);
				}

				// For real rooms, match by location
				const belongsToSameLocation =
					booking.mappedLocation?.id === room?.location_id;
				return date >= checkIn && date < checkOut && belongsToSameLocation;
			})
			.slice(0, 1); // Only show one external booking per cell to avoid clutter

		return { internalReservations, externalReservations };
	};

	const openBookingDetails = (booking: ExternalBooking) => {
		setSelectedBooking(booking);
		setShowBookingDialog(true);
	};

	const formatPrice = (booking: ExternalBooking) => {
		if (booking.raw_data?.price) {
			return `${booking.raw_data.price.toLocaleString()} LKR`;
		}
		return `${booking.total_amount?.toLocaleString() || "0"} ${booking.currency}`;
	};

	const getPaymentInfo = (booking: ExternalBooking) => {
		if (!booking.raw_data) return null;

		const source = booking.raw_data.apiSource?.toLowerCase();

		if (source === "airbnb") {
			const price = booking.raw_data.price;
			const commission = booking.raw_data.commission;
			const expectedPayout = price - commission;

			return {
				type: "airbnb",
				basePrice: price,
				hostFee: commission,
				payout: expectedPayout,
			};
		}

		return null;
	};

	const calendarDates = generateCalendarDates();

	if (loading) {
		return <CalendarSkeleton />;
	}

	return (
		<div className="max-w-full mx-auto p-2 lg:p-4 space-y-3 lg:space-y-4 animate-fade-in">
			{/* Header */}
			<div className="flex items-center gap-2 lg:gap-4">
				<Button
					asChild
					variant="ghost"
					size="icon"
					className="md:hidden size-5"
				>
					<Link to="/">
						<ArrowLeft className="size-4" />
					</Link>
				</Button>
				<div className="flex-1 min-w-0">
					<h1 className="text-lg lg:text-xl xl:text-2xl font-bold text-foreground">
						Reservation Calendar
					</h1>
					<p className="text-xs lg:text-sm text-muted-foreground hidden md:block">
						Room-based calendar view with external bookings
					</p>
				</div>
			</div>

			{/* Main content */}
			<div className="space-y-4">
				{/* Filters & Controls */}
				<div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						{/* Location selector removed - now handled by sidebar */}
					</div>

					<div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
						{/* Debug indicator */}
						<div className="lg:hidden text-xs bg-blue-100 px-2 py-1 rounded">
							Mode: {viewMode}
						</div>

						{/* View Toggle Buttons */}
						<div className="flex items-center bg-muted rounded-lg p-1 gap-1 min-w-fit">
							<Button
								variant={viewMode === "grid" ? "default" : "ghost"}
								size="sm"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									console.log(
										"Timeline button clicked, setting viewMode to grid",
									);
									setViewMode("grid");
								}}
								className="h-8 px-2 sm:px-3 text-xs sm:text-sm touch-manipulation"
								type="button"
							>
								<Grid3X3 className="size-4 mr-1" />
								<span>Timeline</span>
							</Button>
							<Button
								variant={viewMode === "list" ? "default" : "ghost"}
								size="sm"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									console.log("List button clicked, setting viewMode to list");
									setViewMode("list");
								}}
								className="h-8 px-2 sm:px-3 text-xs sm:text-sm touch-manipulation"
								type="button"
							>
								<List className="size-4 mr-1" />
								<span>List</span>
							</Button>
						</div>

						{/* Month Navigation */}
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setCurrentDate(
									new Date(
										currentDate.getFullYear(),
										currentDate.getMonth() - 1,
									),
								)
							}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<span className="text-sm font-medium px-2 sm:px-3 whitespace-nowrap">
							{currentDate.toLocaleDateString(locale, {
								month: "long",
								year: "numeric",
							})}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setCurrentDate(
									new Date(
										currentDate.getFullYear(),
										currentDate.getMonth() + 1,
									),
								)
							}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
				</div>

				{/* Mobile and Desktop Calendar Layout */}
				<div className="space-y-4">
					{/* Mobile View */}
					<div className="lg:hidden">
						{viewMode === "grid" ? (
							// Mobile Timeline View (Responsive Calendar)
							<div className="space-y-4">
								{/* Timeline Navigation */}
								<Card className="bg-card border">
									<CardContent className="p-4">
										<div className="flex items-center justify-between mb-4">
											<h3 className="font-semibold text-lg">
												Calendar Timeline
											</h3>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														const newDate = new Date(currentDate);
														newDate.setDate(newDate.getDate() - 1);
														setCurrentDate(newDate);
													}}
												>
													<ChevronLeft className="size-4" />
												</Button>
												<span className="text-sm font-medium px-3">
													{formatDate(currentDate, {
														weekday: "long",
														month: "short",
														day: "2-digit",
													})}
												</span>
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														const newDate = new Date(currentDate);
														newDate.setDate(newDate.getDate() + 1);
														setCurrentDate(newDate);
													}}
												>
													<ChevronRight className="size-4" />
												</Button>
											</div>
										</div>

										{/* Current Date Timeline */}
										<div className="space-y-3">
											{allDisplayRooms.map((room) => {
												const location = locations.find(
													(l) => l.id === room.location_id,
												);
												const { internalReservations, externalReservations } =
													getBookingsForRoomAndDate(room.id, currentDate);
												const hasBookings =
													internalReservations.length > 0 ||
													externalReservations.length > 0;

												return (
													<div
														key={room.id}
														className="border rounded-lg p-3 bg-muted/20"
													>
														<div className="flex items-center justify-between mb-2">
															<div className="flex-1">
																<div className="font-medium text-sm">
																	{room.room_number}
																</div>
																<div className="text-xs text-muted-foreground">
																	{room.room_type} • {location?.name}
																</div>
															</div>
															<div className="flex items-center gap-2">
																{room.isVirtual && (
																	<Badge
																		variant="secondary"
																		className="text-xs"
																	>
																		{t("calendar.roomInfo.external")}
																	</Badge>
																)}
																<div
																	className={`w-3 h-3 rounded-full ${hasBookings ? "bg-green-500" : "bg-gray-300"}`}
																/>
															</div>
														</div>

														{hasBookings ? (
															<div className="space-y-2">
																{internalReservations.map((booking, index) => (
																	<div
																		key={index}
																		className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded cursor-pointer"
																		onClick={() =>
																			navigate(`/reservations/${booking.id}`)
																		}
																	>
																		<div className="flex-1">
																			<div className="font-medium text-sm">
																				{booking.guest_name ||
																					t("calendar.booking.unknownGuest")}
																			</div>
																			<div className="text-xs text-muted-foreground">
																				{formatDate(
																					new Date(booking.check_in_date),
																					{
																						month: "short",
																						day: "2-digit",
																					},
																				)}{" "}
																				-{" "}
																				{formatDate(
																					new Date(booking.check_out_date),
																					{
																						month: "short",
																						day: "2-digit",
																					},
																				)}
																			</div>
																		</div>
																		<div className="text-right">
																			<Badge
																				variant="default"
																				className="text-xs"
																			>
																				{getInternalStatusLabel(booking.status)}
																			</Badge>
																			<div className="text-xs text-muted-foreground mt-1">
																				{t("calendar.booking.guestsCount", {
																					count:
																						booking.adults + booking.children,
																				})}
																			</div>
																		</div>
																	</div>
																))}
																{externalReservations.map((booking, index) => (
																	<div
																		key={index}
																		className="flex items-center justify-between p-2 bg-purple-50 border border-purple-200 rounded cursor-pointer"
																		onClick={() => openBookingDetails(booking)}
																	>
																		<div className="flex-1">
																			<div className="font-medium text-sm">
																				{booking.guest_name ||
																					t("calendar.booking.unknownGuest")}
																			</div>
																			<div className="text-xs text-muted-foreground">
																				{formatDate(
																					new Date(booking.check_in),
																					{
																						month: "short",
																						day: "2-digit",
																					},
																				)}{" "}
																				-{" "}
																				{formatDate(
																					new Date(booking.check_out),
																					{
																						month: "short",
																						day: "2-digit",
																					},
																				)}
																			</div>
																		</div>
																		<div className="text-right">
																			<Badge
																				variant="outline"
																				className="text-xs"
																			>
																				{booking.source}
																			</Badge>
																			<div className="text-xs text-muted-foreground mt-1">
																				{t("calendar.booking.guestsCount", {
																					count:
																						booking.adults + booking.children,
																				})}
																			</div>
																		</div>
																	</div>
																))}
															</div>
														) : (
															<div
																className="text-center py-3 text-muted-foreground cursor-pointer hover:bg-muted/50 rounded border-2 border-dashed"
																onClick={() => setIsNewReservationDialogOpen(true)}
															>
																<Plus className="size-5 mx-auto mb-1" />
																<p className="text-xs">
																	{t("calendar.booking.addBooking")}
																</p>
															</div>
														)}
													</div>
												);
											})}
										</div>
									</CardContent>
								</Card>

								{/* Week Overview */}
								<Card className="bg-card border">
									<CardHeader className="pb-3">
										<CardTitle className="text-sm font-medium">
											{t("calendar.timeline.weekOverview")}
										</CardTitle>
									</CardHeader>
									<CardContent>
										<div className="grid grid-cols-7 gap-1">
											{Array.from({ length: 7 }, (_, i) => {
												const date = new Date(currentDate);
												date.setDate(
													currentDate.getDate() - currentDate.getDay() + i,
												);
												const dayBookings = allDisplayRooms.reduce(
													(total, room) => {
														const {
															internalReservations,
															externalReservations,
														} = getBookingsForRoomAndDate(room.id, date);
														return (
															total +
															internalReservations.length +
															externalReservations.length
														);
													},
													0,
												);
												const isToday =
													format(date, "yyyy-MM-dd") ===
													format(new Date(), "yyyy-MM-dd");
												const isSelected =
													format(date, "yyyy-MM-dd") ===
													format(currentDate, "yyyy-MM-dd");

												return (
													<div
														key={i}
														className={`text-center p-2 rounded cursor-pointer transition-colors ${
															isSelected
																? "bg-primary text-primary-foreground"
																: isToday
																	? "bg-accent text-accent-foreground"
																	: "hover:bg-muted"
														}`}
														onClick={() => setCurrentDate(date)}
													>
														<div className="text-xs font-medium">
															{date.toLocaleDateString(locale, {
																weekday: "short",
															})}
														</div>
														<div className="text-sm font-bold">
															{date.getDate()}
														</div>
														{dayBookings > 0 && (
															<div className="w-1 h-1 bg-current rounded-full mx-auto mt-1" />
														)}
													</div>
												);
											})}
										</div>
									</CardContent>
								</Card>
							</div>
						) : (
							// Mobile List View (Simple list of bookings)
							<div className="space-y-3">
								{allDisplayRooms
									.map((room) => {
										const location = locations.find(
											(l) => l.id === room.location_id,
										);
										const allRoomBookings = calendarDates.flatMap((date) => {
											const { internalReservations, externalReservations } =
												getBookingsForRoomAndDate(room.id, date);
											return [
												...internalReservations.map((booking) => ({
													...booking,
													type: "internal",
													date,
												})),
												...externalReservations.map((booking) => ({
													...booking,
													type: "external",
													date,
												})),
											];
										});

										if (allRoomBookings.length === 0) return null;

										return (
											<Card key={room.id} className="bg-card border">
												<CardHeader className="pb-2">
													<div className="flex items-center justify-between">
														<div>
															<CardTitle className="text-sm font-medium">
																{room.room_number}
															</CardTitle>
															<p className="text-xs text-muted-foreground">
																{room.room_type} • {location?.name}
															</p>
														</div>
														<Badge variant="outline" className="text-xs">
															{t("calendar.booking.bookingCount", {
																count: allRoomBookings.length,
															})}
														</Badge>
													</div>
												</CardHeader>
												<CardContent className="pt-0">
													<div className="space-y-2">
														{allRoomBookings.map((booking, index) => (
															<div
																key={index}
																className="flex items-center justify-between p-2 border rounded-lg"
															>
																<div className="flex-1">
																	<div className="font-medium text-sm">
																		{booking.guest_name ||
																			t("calendar.booking.unknownGuest")}
																	</div>
																	<div className="text-xs text-muted-foreground">
																		{booking.type === "internal"
																			? `${formatDate(new Date((booking as any).check_in_date), { month: "short", day: "2-digit" })} - ${formatDate(new Date((booking as any).check_out_date), { month: "short", day: "2-digit" })}`
																			: `${formatDate(new Date((booking as any).check_in), { month: "short", day: "2-digit" })} - ${formatDate(new Date((booking as any).check_out), { month: "short", day: "2-digit" })}`}
																	</div>
																</div>
																<div className="text-right">
																	<Badge
																		variant={
																			booking.type === "internal"
																				? "default"
																				: "outline"
																		}
																		className="text-xs"
																	>
																		{booking.type === "internal"
																			? getInternalStatusLabel(
																					(booking as any).status,
																				)
																			: (booking as any).source}
																	</Badge>
																</div>
															</div>
														))}
													</div>
												</CardContent>
											</Card>
										);
									})
									.filter(Boolean)}
							</div>
						)}
					</div>

					{/* Desktop Calendar Grid */}
					<div className="hidden lg:block">
						{viewMode === "grid" ? (
							// Desktop Grid View (Calendar)
							<Card className="bg-card border">
								<CardContent className="p-0">
									<div className="overflow-x-auto overflow-y-hidden">
										<div className="min-w-max">
											{/* Header with dates */}
											<div
												className="grid sticky top-0 z-10 bg-background"
												style={{
													gridTemplateColumns: `minmax(180px, 200px) repeat(${calendarDates.length}, minmax(50px, 1fr))`,
												}}
											>
												<div className="border-b border-r p-3 bg-muted font-semibold text-sm sticky left-0 z-20">
													<div>{t("calendar.roomInfo.roomVilla")}</div>
													<div className="text-xs text-muted-foreground">
														{t("calendar.roomInfo.typeLocation")}
													</div>
												</div>
												{calendarDates.map((date, index) => (
													<div
														key={index}
														className="border-b border-r p-2 text-center bg-muted min-w-[50px]"
													>
														<div className="text-sm font-medium">
															{date.getDate()}
														</div>
														<div className="text-xs text-muted-foreground">
															{date.toLocaleDateString(locale, {
																weekday: "short",
															})}
														</div>
													</div>
												))}
											</div>

											{/* Room rows */}
											{allDisplayRooms.map((room) => {
												const location = locations.find(
													(l) => l.id === room.location_id,
												);
												return (
													<div
														key={room.id}
														className="grid"
														style={{
															gridTemplateColumns: `minmax(180px, 200px) repeat(${calendarDates.length}, minmax(50px, 1fr))`,
														}}
													>
														{/* Room info column */}
														<div
															className={`border-b border-r p-3 sticky left-0 z-10 ${room.isVirtual ? "bg-purple-50" : "bg-background"}`}
														>
															<div
																className="font-medium text-sm truncate"
																title={room.room_number}
															>
																{room.room_number}
															</div>
															<div
																className="text-xs text-muted-foreground truncate"
																title={room.room_type}
															>
																{room.room_type}
															</div>
															<div className="text-xs text-muted-foreground mt-1">
																{location?.name}
															</div>
															{room.isVirtual && (
																<Badge
																	variant="secondary"
																	className="text-xs mt-1"
																>
																	External
																</Badge>
															)}
														</div>

														{/* Date columns */}
														{calendarDates.map((date, dateIndex) => {
															const {
																internalReservations,
																externalReservations,
															} = getBookingsForRoomAndDate(room.id, date);
															const internalReservation =
																internalReservations[0];
															const externalReservation =
																externalReservations[0];

															return (
																<div
																	key={dateIndex}
																	className="border-b border-r min-h-[80px] p-1 relative min-w-[50px]"
																>
																	{internalReservation && (
																		<div
																			className={`text-xs p-1 rounded text-center cursor-pointer mb-1 ${getStatusColor(internalReservation.status)} overflow-hidden`}
																			onClick={() =>
																				navigate(
																					`/reservations/${internalReservation.id}`,
																				)
																			}
																			title={`${internalReservation.guest_name} - ${internalReservation.status}`}
																		>
																			<div className="font-medium text-xs leading-tight truncate"></div>
																			<div className="text-xs opacity-75 leading-tight">
																				{new Date(
																					internalReservation.check_in_date,
																				).getDate()}
																				-
																				{new Date(
																					internalReservation.check_out_date,
																				).getDate()}
																			</div>
																		</div>
																	)}

																	{externalReservation && (
																		<div
																			className={`text-xs p-1 rounded text-center cursor-pointer ${getStatusColor(externalReservation.status, true)} overflow-hidden`}
																			onClick={() =>
																				openBookingDetails(externalReservation)
																			}
																			title={`${t("calendar.roomInfo.external")}: ${
																				externalReservation.guest_name ||
																				t("calendar.booking.unknownGuest")
																			} - ${externalReservation.source}`}
																		>
																			<div className="font-medium text-xs leading-tight truncate">
																				{(
																					(externalReservation.raw_data as any)
																						?.firstName ||
																					externalReservation.guest_name?.split(
																						" ",
																					)[0] ||
																					"Ext"
																				).slice(0, 6)}
																			</div>
																			<div className="text-xs opacity-75 leading-tight">
																				{externalReservation.source
																					.charAt(0)
																					.toUpperCase()}
																			</div>
																		</div>
																	)}

																	{!internalReservation &&
																		!externalReservation && (
																			<div
																				className="h-full hover:bg-muted/50 cursor-pointer rounded"
																				onClick={() => setIsNewReservationDialogOpen(true)}
																			/>
																		)}
																</div>
															);
														})}
													</div>
												);
											})}
										</div>
									</div>
								</CardContent>
							</Card>
						) : (
							// Desktop List View (Table-like list)
							<Card className="bg-card border">
								<CardContent className="p-0">
									<div className="space-y-0">
										{/* Header */}
										<div className="grid grid-cols-6 gap-4 p-4 bg-muted font-semibold text-sm border-b">
											<div className="col-span-2">
												{t("calendar.roomInfo.roomVilla")}
											</div>
											<div>{t("calendar.booking.guestsLabel")}</div>
											<div>{t("calendar.stay.checkIn")}</div>
											<div>{t("calendar.stay.checkOut")}</div>
											<div>{t("calendar.legend.statusLabel")}</div>
										</div>

										{/* Booking rows */}
										{allDisplayRooms
											.flatMap((room) => {
												const location = locations.find(
													(l) => l.id === room.location_id,
												);
												const allRoomBookings = calendarDates.flatMap(
													(date) => {
														const {
															internalReservations,
															externalReservations,
														} = getBookingsForRoomAndDate(room.id, date);
														return [
															...internalReservations.map((booking) => ({
																...booking,
																type: "internal",
																room,
																location,
															})),
															...externalReservations.map((booking) => ({
																...booking,
																type: "external",
																room,
																location,
															})),
														];
													},
												);
												return allRoomBookings;
											})
											.map((booking, index) => (
												<div
													key={index}
													className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-muted/30"
												>
													<div className="col-span-2">
														<div className="font-medium text-sm">
															{(booking as any).room.room_number}
														</div>
														<div className="text-xs text-muted-foreground">
															{(booking as any).room.room_type} •{" "}
															{(booking as any).location?.name}
														</div>
													</div>
													<div>
														<div className="font-medium text-sm">
															{booking.guest_name ||
																t("calendar.booking.unknownGuest")}
														</div>
														<div className="text-xs text-muted-foreground">
															{t("calendar.booking.guestsCount", {
																count: booking.adults + booking.children,
															})}
														</div>
													</div>
													<div className="text-sm">
														{booking.type === "internal"
															? formatDate(
																	new Date((booking as any).check_in_date),
																	{
																		month: "short",
																		day: "2-digit",
																		year: "numeric",
																	},
																)
															: formatDate(
																	new Date((booking as any).check_in),
																	{
																		month: "short",
																		day: "2-digit",
																		year: "numeric",
																	},
																)}
													</div>
													<div className="text-sm">
														{booking.type === "internal"
															? formatDate(
																	new Date((booking as any).check_out_date),
																	{
																		month: "short",
																		day: "2-digit",
																		year: "numeric",
																	},
																)
															: formatDate(
																	new Date((booking as any).check_out),
																	{
																		month: "short",
																		day: "2-digit",
																		year: "numeric",
																	},
																)}
													</div>
													<div>
														<Badge
															variant={
																booking.type === "internal"
																	? "default"
																	: "outline"
															}
															className="text-xs"
														>
															{booking.type === "internal"
																? getInternalStatusLabel(
																		(booking as any).status,
																	)
																: (booking as any).source}
														</Badge>
													</div>
												</div>
											))}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</div>

				{/* Legend */}
				<div className="flex flex-wrap gap-2 lg:gap-4 text-xs">
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div>
						<span>Internal - Confirmed</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded"></div>
						<span>Internal - Tentative</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
						<span>External - Confirmed</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-indigo-100 border border-indigo-200 rounded"></div>
						<span>External - New</span>
					</div>
					<div className="flex items-center gap-1">
						<div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
						<span>Cancelled</span>
					</div>
				</div>

				{/* Booking Details Dialog */}
				<Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
					<DialogContent className="max-w-lg mx-auto max-h-[80vh] overflow-y-auto sm:max-w-2xl">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Eye className="size-5" />
								Booking Details #{selectedBooking?.external_id}
							</DialogTitle>
						</DialogHeader>

						{selectedBooking && (
							<div className="space-y-4">
								{/* Guest Information */}
								<div className="space-y-3">
									<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
										<Users className="size-4" />
										Guest Information
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
										<div>
											<div className="text-xs text-muted-foreground">
												Guest Name
											</div>
											<div className="font-medium text-sm">
												{selectedBooking.raw_data?.firstName &&
												selectedBooking.raw_data?.lastName
													? `${selectedBooking.raw_data.firstName} ${selectedBooking.raw_data.lastName}`
													: selectedBooking.guest_name || "Unknown Guest"}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">Email</div>
											<div className="font-medium text-sm">
												{selectedBooking.raw_data?.email || "Not available"}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">
												Guests
											</div>
											<div className="font-medium text-sm">
												{selectedBooking.adults} adults
												{selectedBooking.children > 0 &&
													`, ${selectedBooking.children} children`}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">Phone</div>
											<div className="font-medium text-sm">
												{selectedBooking.raw_data?.phone ||
													selectedBooking.raw_data?.mobile ||
													"Not available"}
											</div>
										</div>
									</div>
								</div>

								{/* Stay Information */}
								<div className="space-y-3">
									<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
										<CalendarIcon className="size-4" />
										Stay Information
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
										<div>
											<div className="text-xs text-muted-foreground">
												Check-in
											</div>
											<div className="font-medium text-sm">
												{format(
													new Date(selectedBooking.check_in),
													"MMMM do, yyyy",
												)}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">
												Check-out
											</div>
											<div className="font-medium text-sm">
												{format(
													new Date(selectedBooking.check_out),
													"MMMM do, yyyy",
												)}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">
												Nights
											</div>
											<div className="font-medium text-sm">
												{Math.ceil(
													(new Date(selectedBooking.check_out).getTime() -
														new Date(selectedBooking.check_in).getTime()) /
														(1000 * 60 * 60 * 24),
												)}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">
												Booking Date
											</div>
											<div className="font-medium text-sm">
												{selectedBooking.raw_data?.bookingTime
													? format(
															new Date(selectedBooking.raw_data.bookingTime),
															"MMMM do, yyyy",
														)
													: format(
															new Date(selectedBooking.created_at),
															"MMMM do, yyyy",
														)}
											</div>
										</div>
									</div>
								</div>

								{/* Property Information */}
								<div className="space-y-3">
									<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
										<MapPin className="size-4" />
										Property Information
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
										<div>
											<div className="text-xs text-muted-foreground">
												Location
											</div>
											<div className="font-medium text-sm">
												{selectedBooking.mappedLocation?.name ||
													selectedBooking.location?.name ||
													"Unknown Location"}
											</div>
										</div>
										<div>
											<div className="text-xs text-muted-foreground">Room</div>
											<div className="font-medium text-sm">
												{selectedBooking.room_name || "Unknown Room"}
											</div>
										</div>
									</div>
								</div>

								{/* Payment Information */}
								{getPaymentInfo(selectedBooking) && (
									<div className="space-y-3">
										<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
											<DollarSign className="size-4" />
											Payment Information
										</div>
										<div className="p-3 bg-muted/30 rounded-lg space-y-2">
											{(() => {
												const paymentInfo = getPaymentInfo(selectedBooking);
												if (paymentInfo?.type === "airbnb") {
													return (
														<>
															<div className="flex justify-between text-sm">
																<span>Base Price:</span>
																<span className="font-medium">
																	{paymentInfo.basePrice?.toLocaleString()} LKR
																</span>
															</div>
															<div className="flex justify-between text-sm text-red-600">
																<span>Host Fee:</span>
																<span className="font-medium">
																	-{paymentInfo.hostFee?.toLocaleString()} LKR
																</span>
															</div>
															<div className="border-t pt-2 flex justify-between font-semibold text-sm">
																<span>Expected Payout:</span>
																<span>
																	{paymentInfo.payout?.toLocaleString()} LKR
																</span>
															</div>
															<div className="text-xs text-muted-foreground mt-2">
																Cancel policy flexible
															</div>
														</>
													);
												}
												return (
													<div className="flex justify-between font-semibold text-sm">
														<span>Total Amount:</span>
														<span>{formatPrice(selectedBooking)}</span>
													</div>
												);
											})()}
										</div>
									</div>
								)}

								{/* Status and Source */}
								<div className="flex flex-wrap gap-2 pt-2">
									<Badge
										className={getStatusColor(selectedBooking.status, true)}
									>
										{selectedBooking.status.charAt(0).toUpperCase() +
											selectedBooking.status.slice(1)}
									</Badge>
									<Badge variant="outline">
										{selectedBooking.raw_data?.apiSource ||
											selectedBooking.source}
									</Badge>
									{selectedBooking.raw_data?.apiReference && (
										<Badge variant="secondary" className="text-xs">
											{selectedBooking.raw_data.apiReference}
										</Badge>
									)}
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>

				{/* New Reservation Dialog */}
				<NewReservationDialog
					isOpen={isNewReservationDialogOpen}
					onClose={() => setIsNewReservationDialogOpen(false)}
					onReservationCreated={() => {
						setIsNewReservationDialogOpen(false);
						refetch(); // Refresh calendar data
					}}
				/>
			</div>
		</div>
	);
}
