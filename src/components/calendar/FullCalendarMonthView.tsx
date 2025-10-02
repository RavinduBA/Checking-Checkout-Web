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

	// Get reservations for a specific date
	const getReservationsForDate = (date: Date) => {
		return filteredReservations.filter((reservation) => {
			const checkIn = parseISO(reservation.check_in_date);
			const checkOut = parseISO(reservation.check_out_date);
			return date >= checkIn && date < checkOut;
		});
	};

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

					{/* Calendar grid */}
					<div className="grid grid-cols-7 gap-1">
						{calendarDates.map((date) => {
							const dayReservations = getReservationsForDate(date);
							const isCurrentMonth = isSameMonth(date, currentDate);
							const isDateToday = isToday(date);

							return (
								<div
									key={date.toString()}
									className={cn(
										"min-h-[120px] p-2 border rounded-md transition-colors cursor-pointer",
										"hover:bg-muted/50",
										!isCurrentMonth && "bg-muted/20 text-muted-foreground",
										isDateToday && "border-primary"
									)}
									onClick={() => {
										if (isCurrentMonth && dayReservations.length === 0 && rooms.length > 0) {
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
										{isCurrentMonth && dayReservations.length === 0 && rooms.length > 0 && (
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

									{/* Reservations */}
									<div className="space-y-1">
										{dayReservations.slice(0, 3).map((reservation) => (
											<div
												key={reservation.id}
												className={cn(
													"text-xs p-1 rounded cursor-pointer truncate",
													"text-white transition-colors",
													getStatusColor(reservation.status)
												)}
												onClick={(e) => {
													e.stopPropagation();
													onBookingClick(reservation);
												}}
												title={`${reservation.guest_name} - ${reservation.rooms?.room_number} (${reservation.status})`}
											>
												<div className="font-medium truncate">
													{reservation.guest_name}
												</div>
												<div className="text-xs opacity-90 truncate">
													{reservation.rooms?.room_number}
												</div>
											</div>
										))}
										{dayReservations.length > 3 && (
											<div 
												className="text-xs text-muted-foreground p-1 cursor-pointer hover:underline"
												onClick={(e) => {
													e.stopPropagation();
													// You could implement a modal to show all reservations for this day
												}}
											>
												+{dayReservations.length - 3} more
											</div>
										)}
									</div>
								</div>
							);
						})}
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