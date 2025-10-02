import { useQuery } from "@tanstack/react-query";
import {
	eachDayOfInterval,
	endOfMonth,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	parseISO,
	startOfMonth,
	startOfWeek,
	endOfWeek,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

interface FullCalendarMonthViewProps {
	currentDate: Date;
	searchTerm: string;
	statusFilter: string;
	roomFilter: string;
	onBookingClick: (booking: Reservation) => void;
	onQuickBook: (room: Room, date: Date) => void;
	getStatusColor: (status: string) => string;
	getStatusBorderColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
}

export function FullCalendarMonthView({
	currentDate,
	searchTerm,
	statusFilter,
	roomFilter,
	onBookingClick,
	onQuickBook,
	getStatusColor,
	getStatusBorderColor,
	getCurrencySymbol,
}: FullCalendarMonthViewProps) {
	const navigate = useNavigate();
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

	// Get calendar dates (full weeks)
	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const startDate = startOfWeek(monthStart);
	const endDate = endOfWeek(monthEnd);
	const calendarDates = eachDayOfInterval({ start: startDate, end: endDate });

	// Fetch reservations
	const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
		queryKey: ["reservations", selectedLocation, tenant?.id, currentDate],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("reservations")
				.select(`
					*,
					rooms(room_number, room_type),
					locations(name)
				`)
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.or(
					`check_in_date.lte.${format(monthEnd, "yyyy-MM-dd")},check_out_date.gte.${format(monthStart, "yyyy-MM-dd")}`
				)
				.order("check_in_date", { ascending: true });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Fetch rooms for quick booking
	const { data: rooms = [] } = useQuery({
		queryKey: ["rooms", selectedLocation, tenant?.id],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.order("room_number", { ascending: true });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Apply filters
	const filteredReservations = reservations.filter((reservation) => {
		// Search filter
		if (searchTerm.trim()) {
			const searchLower = searchTerm.toLowerCase();
			const matchesSearch =
				reservation.guest_name.toLowerCase().includes(searchLower) ||
				reservation.reservation_number.toLowerCase().includes(searchLower) ||
				reservation.rooms?.room_number.toLowerCase().includes(searchLower) ||
				reservation.rooms?.room_type.toLowerCase().includes(searchLower);

			if (!matchesSearch) return false;
		}

		// Status filter
		if (statusFilter !== "all" && reservation.status !== statusFilter) {
			return false;
		}

		// Room filter
		if (roomFilter !== "all" && reservation.room_id !== roomFilter) {
			return false;
		}

		return true;
	});

	// Get reservations for a specific date (only those that start on this date)
	const getReservationsStartingOnDate = (date: Date) => {
		return filteredReservations.filter((reservation) => {
			const checkIn = parseISO(reservation.check_in_date);
			return isSameDay(checkIn, date);
		});
	};

	// Calculate the span of a reservation across the calendar grid
	const calculateReservationSpan = (reservation: Reservation, startDate: Date) => {
		const checkIn = parseISO(reservation.check_in_date);
		const checkOut = parseISO(reservation.check_out_date);
		
		// Find the starting position in the calendar grid
		const startIndex = calendarDates.findIndex(date => isSameDay(date, checkIn));
		if (startIndex === -1) return null;

		// Calculate how many days to span
		let spanDays = 0;
		let currentDate = checkIn;
		
		while (currentDate < checkOut && startIndex + spanDays < calendarDates.length) {
			const currentGridDate = calendarDates[startIndex + spanDays];
			if (!currentGridDate || currentDate >= checkOut) break;
			
			// Check if we need to break at the end of a week
			const dayOfWeek = startIndex + spanDays;
			const isEndOfWeek = (dayOfWeek + 1) % 7 === 0;
			
			spanDays++;
			currentDate = new Date(currentDate);
			currentDate.setDate(currentDate.getDate() + 1);
			
			// If it's end of week and reservation continues, we'll handle it in the next week
			if (isEndOfWeek && currentDate < checkOut) {
				break;
			}
		}

		return {
			startIndex,
			spanDays: Math.max(1, spanDays),
			totalDays: Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
		};
	};

	// Get all reservation segments (handling week breaks)
	const getReservationSegments = () => {
		const segments: Array<{
			reservation: Reservation;
			startIndex: number;
			spanDays: number;
			isStart: boolean;
			isEnd: boolean;
			totalDays: number;
			lane: number;
		}> = [];

		// Track occupied lanes for each date
		const occupiedLanes: { [key: number]: Set<number> } = {};

		filteredReservations.forEach((reservation) => {
			const checkIn = parseISO(reservation.check_in_date);
			const checkOut = parseISO(reservation.check_out_date);
			
			// Find all segments of this reservation across different weeks
			let currentDate = checkIn;
			
			while (currentDate < checkOut) {
				const startIndex = calendarDates.findIndex(date => isSameDay(date, currentDate));
				if (startIndex === -1) break;

				// Calculate span for this segment
				let spanDays = 0;
				const segmentDate = new Date(currentDate);
				
				while (segmentDate < checkOut && startIndex + spanDays < calendarDates.length) {
					const dayOfWeek = (startIndex + spanDays) % 7;
					
					spanDays++;
					segmentDate.setDate(segmentDate.getDate() + 1);
					
					// Break at end of week if reservation continues
					if (dayOfWeek === 6 && segmentDate < checkOut) {
						break;
					}
				}

				// Find available lane for this segment
				let lane = 0;
				const segmentEnd = startIndex + spanDays - 1;
				
				while (lane < 5) { // Max 5 lanes
					let isLaneAvailable = true;
					
					for (let i = startIndex; i <= segmentEnd; i++) {
						if (!occupiedLanes[i]) occupiedLanes[i] = new Set();
						if (occupiedLanes[i].has(lane)) {
							isLaneAvailable = false;
							break;
						}
					}
					
					if (isLaneAvailable) {
						// Mark this lane as occupied for all days in the segment
						for (let i = startIndex; i <= segmentEnd; i++) {
							occupiedLanes[i].add(lane);
						}
						break;
					}
					
					lane++;
				}

				const totalDays = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
				
				segments.push({
					reservation,
					startIndex,
					spanDays: Math.max(1, spanDays),
					isStart: isSameDay(currentDate, checkIn),
					isEnd: segmentDate >= checkOut,
					totalDays,
					lane
				});

				currentDate = new Date(segmentDate);
			}
		});

		return segments;
	};

	const reservationSegments = getReservationSegments();

	const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	if (reservationsLoading) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="space-y-4">
						{/* Weekday headers */}
						<div className="grid grid-cols-7 gap-1">
							{weekdays.map((day) => (
								<div
									key={day}
									className="p-2 text-center text-sm font-medium text-muted-foreground"
								>
									{day}
								</div>
							))}
						</div>
						{/* Calendar grid skeleton */}
						<div className="grid grid-cols-7 gap-1">
							{Array.from({ length: 42 }, (_, i) => (
								<div key={i} className="aspect-square p-2 border rounded-md">
									<Skeleton className="h-6 w-6 mb-2" />
									<div className="space-y-1">
										{Math.random() > 0.7 && <Skeleton className="h-3 w-full" />}
										{Math.random() > 0.8 && <Skeleton className="h-3 w-3/4" />}
									</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardContent className="p-6">
				<div className="space-y-4">
					{/* Weekday headers */}
					<div className="grid grid-cols-7 gap-1">
						{weekdays.map((day, index) => (
							<div
								key={day}
								className={cn(
									"p-2 text-center text-sm font-medium text-muted-foreground",
									[0, 6].includes(index) && "text-muted-foreground/50"
								)}
							>
								{day}
							</div>
						))}
					</div>

					{/* Calendar grid with reservations as overlays */}
					<div className="relative">
						{/* Calendar grid */}
						<div className="grid grid-cols-7 gap-1">
							{calendarDates.map((date, index) => {
								const isCurrentMonth = isSameMonth(date, currentDate);
								const isDateToday = isToday(date);

								return (
									<div
										key={date.toString()}
										className={cn(
											"min-h-[140px] p-2 border rounded-md transition-colors cursor-pointer relative",
											"hover:bg-muted/50",
											!isCurrentMonth && "bg-muted/20 text-muted-foreground",
											isDateToday && "border-primary"
										)}
										onClick={() => {
											if (isCurrentMonth && rooms.length > 0) {
												navigate(`/reservations/new?date=${format(date, "yyyy-MM-dd")}`);
											}
										}}
									>
										{/* Date number */}
										<div className="flex items-center justify-between mb-2">
											<span
												className={cn(
													"text-sm font-medium",
													isDateToday && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
												)}
											>
												{format(date, "d")}
											</span>
											{isCurrentMonth && rooms.length > 0 && (
												<Button
													variant="ghost"
													size="sm"
													className="h-6 w-6 p-0 opacity-50 md:opacity-0 hover:opacity-100 transition-opacity"
													onClick={(e) => {
														e.stopPropagation();
														navigate(`/reservations/new?date=${format(date, "yyyy-MM-dd")}`);
													}}
												>
													<Plus className="h-3 w-3" />
												</Button>
											)}
										</div>
									</div>
								);
							})}
						</div>

						{/* Reservation bars overlay */}
						<div className="absolute inset-0 pointer-events-none">
							{reservationSegments.map((segment, segmentIndex) => {
								const { reservation, startIndex, spanDays, isStart, isEnd, lane } = segment;
								
								// Calculate position
								const row = Math.floor(startIndex / 7);
								const col = startIndex % 7;
								
								return (
									<div
										key={`${reservation.id}-${segmentIndex}`}
										className={cn(
											"absolute pointer-events-auto cursor-pointer transition-colors",
											"text-white text-xs font-medium",
											getStatusColor(reservation.status),
											"rounded-md px-2 py-1 truncate shadow-sm",
											!isStart && "rounded-l-none",
											!isEnd && "rounded-r-none"
										)}
										style={{
											top: `${row * 141 + 40 + (lane * 20)}px`, // 141px per row (140px + 1px gap), 40px offset for date, 20px per lane
											left: `calc(${col * (100/7)}% + ${col * 0.25}rem)`,
											width: `calc(${spanDays * (100/7)}% - ${Math.max(0, spanDays - 1) * 0.25}rem)`,
											height: '18px',
											zIndex: 10,
											maxWidth: `calc(${(7-col) * (100/7)}% - ${Math.max(0, (7-col) - 1) * 0.25}rem)` // Prevent overflow beyond week
										}}
										onClick={(e) => {
											e.stopPropagation();
											onBookingClick(reservation);
										}}
										title={`${reservation.guest_name} - ${reservation.rooms?.room_number} (${reservation.status}) - ${format(parseISO(reservation.check_in_date), 'MMM dd')} to ${format(parseISO(reservation.check_out_date), 'MMM dd')}`}
									>
										{isStart && (
											<span className="truncate block">
												{reservation.guest_name} - {reservation.rooms?.room_number}
											</span>
										)}
										{!isStart && (
											<span className="truncate block opacity-75">
												{reservation.guest_name}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>

					{/* Legend */}
					<div className="flex flex-wrap gap-4 text-xs border-t pt-4">
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-green-500 rounded"></div>
							<span>Confirmed</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-yellow-500 rounded"></div>
							<span>Tentative</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-blue-500 rounded"></div>
							<span>Pending</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-purple-500 rounded"></div>
							<span>Checked In</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-gray-500 rounded"></div>
							<span>Checked Out</span>
						</div>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-red-500 rounded"></div>
							<span>Cancelled</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}