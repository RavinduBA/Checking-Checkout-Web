import { useQuery } from "@tanstack/react-query";
import {
	differenceInDays,
	eachDayOfInterval,
	endOfDay,
	endOfMonth,
	format,
	isSameDay,
	isWithinInterval,
	parseISO,
	startOfDay,
	startOfMonth,
} from "date-fns";
import { useLocationContext } from "@/context/LocationContext";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { CalendarLegend } from "./CalendarLegend";
import { RoomRow } from "./RoomRow";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

interface BookingSpan {
	startIndex: number;
	spanDays: number;
	isVisible: boolean;
}

interface TimelineViewProps {
	currentDate: Date;
	searchTerm: string;
	statusFilter: string;
	roomFilter: string;
	onBookingClick: (booking: Reservation) => void;
	onQuickBook: (room: Room, date: Date) => void;
	getStatusColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
}

export function TimelineView({
	currentDate,
	searchTerm,
	statusFilter,
	roomFilter,
	onBookingClick,
	onQuickBook,
	getStatusColor,
	getCurrencySymbol,
}: TimelineViewProps) {
	const { selectedLocation } = useLocationContext();
	const { tenant } = useTenant();

	// Fetch rooms
	const { data: rooms = [], isLoading: roomsLoading } = useQuery({
		queryKey: ["rooms", selectedLocation, tenant?.id],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const { data, error } = await supabase
				.from("rooms")
				.select("*")
				.eq("tenant_id", tenant.id)
				.eq("location_id", selectedLocation)
				.eq("is_active", true)
				.order("room_number");

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Fetch reservations
	const { data: reservations = [], isLoading: reservationsLoading } = useQuery({
		queryKey: ["reservations", selectedLocation, tenant?.id, currentDate],
		queryFn: async () => {
			if (!selectedLocation || !tenant?.id) return [];

			const monthStart = startOfMonth(currentDate);
			const monthEnd = endOfMonth(currentDate);

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
					`check_in_date.lte.${format(monthEnd, "yyyy-MM-dd")},check_out_date.gte.${format(monthStart, "yyyy-MM-dd")}`,
				)
				.order("check_in_date", { ascending: true });

			if (error) throw error;
			return data || [];
		},
		enabled: !!selectedLocation && !!tenant?.id,
	});

	// Generate calendar days for the month
	const monthStart = startOfMonth(currentDate);
	const monthEnd = endOfMonth(currentDate);
	const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

	// Calculate booking span
	const calculateBookingSpan = (
		booking: Reservation,
		calendarDays: Date[],
	): BookingSpan => {
		const checkIn = parseISO(booking.check_in_date);
		const checkOut = parseISO(booking.check_out_date);

		const monthStart = calendarDays[0];
		const monthEnd = calendarDays[calendarDays.length - 1];

		// Check if booking overlaps with the month
		const bookingStart = startOfDay(checkIn);
		const bookingEnd = endOfDay(checkOut);
		const monthInterval = {
			start: startOfDay(monthStart),
			end: endOfDay(monthEnd),
		};

		const isVisible =
			isWithinInterval(bookingStart, monthInterval) ||
			isWithinInterval(bookingEnd, monthInterval) ||
			(bookingStart <= monthInterval.start && bookingEnd >= monthInterval.end);

		if (!isVisible) {
			return { startIndex: -1, spanDays: 0, isVisible: false };
		}

		// Find start index
		const effectiveStart =
			bookingStart < monthInterval.start ? monthStart : checkIn;
		const startIndex = calendarDays.findIndex((day) =>
			isSameDay(day, effectiveStart),
		);

		// Calculate span days
		const effectiveEnd = bookingEnd > monthInterval.end ? monthEnd : checkOut;
		const spanDays = Math.max(
			1,
			differenceInDays(effectiveEnd, effectiveStart) + 1,
		);

		return {
			startIndex: Math.max(0, startIndex),
			spanDays: Math.min(
				spanDays,
				calendarDays.length - Math.max(0, startIndex),
			),
			isVisible: true,
		};
	};

	// Apply filters to rooms
	const filteredRooms = rooms.filter((room) => {
		if (roomFilter !== "all" && room.id !== roomFilter) {
			return false;
		}
		return true;
	});

	// Apply filters to reservations
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

		return true;
	});

	if (roomsLoading || reservationsLoading) {
		return (
			<div className="border rounded-lg overflow-hidden">
				<div className="animate-pulse">
					<div className="h-12 bg-gray-200 border-b"></div>
					{Array.from({ length: 5 }, (_, i) => (
						<div key={i} className="h-16 bg-gray-100 border-b"></div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="border rounded-lg overflow-hidden">
			{/* Calendar Header */}
			<div className="bg-white border-b sticky top-0 z-20">
				<div className="flex">
					<div className="w-32 sm:w-48 p-2 sm:p-4 bg-gray-50 border-r border-gray-200 font-medium">
						Room
					</div>
					<div className="flex-1 flex overflow-x-auto">
						{calendarDays.map((day) => (
							<div
								key={day.toISOString()}
								className="min-w-[48px] sm:min-w-[60px] p-1 sm:p-2 text-center border-r border-gray-200 bg-gray-50"
							>
								<div className="text-xs font-medium">{format(day, "EEE")}</div>
								<div className="text-xs sm:text-sm">{format(day, "dd")}</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Room Rows */}
			<div className="overflow-x-auto">
				{filteredRooms.length === 0 ? (
					<div className="p-8 text-center text-gray-500">
						No rooms available for the selected filters.
					</div>
				) : (
					filteredRooms.map((room) => (
						<RoomRow
							key={room.id}
							room={room}
							calendarDays={calendarDays}
							reservations={filteredReservations}
							onBookingClick={onBookingClick}
							onQuickBook={onQuickBook}
							getStatusColor={getStatusColor}
							getCurrencySymbol={getCurrencySymbol}
							calculateBookingSpan={calculateBookingSpan}
						/>
					))
				)}
			</div>

			{/* Legend */}
			<CalendarLegend className="p-3 sm:p-4 bg-gray-50 border-t" />
		</div>
	);
}
