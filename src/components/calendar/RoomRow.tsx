import { format, parseISO } from "date-fns";
import { Plus } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

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

interface RoomRowProps {
	room: Room;
	calendarDays: Date[];
	reservations: Reservation[];
	onBookingClick: (booking: Reservation) => void;
	onQuickBook: (room: Room, date: Date) => void;
	getStatusColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
	calculateBookingSpan: (
		booking: Reservation,
		calendarDays: Date[],
	) => BookingSpan;
}

export function RoomRow({
	room,
	calendarDays,
	reservations,
	onBookingClick,
	onQuickBook,
	getStatusColor,
	getCurrencySymbol,
	calculateBookingSpan,
}: RoomRowProps) {
	const isMobile = useIsMobile();

	// Filter reservations for this room
	const roomBookings = reservations
		.filter((reservation) => reservation.room_id === room.id)
		.map((booking) => ({
			...booking,
			span: calculateBookingSpan(booking, calendarDays),
		}))
		.filter((booking) => booking.span.isVisible);

	return (
		<div key={room.id} className="border-b border-gray-200">
			{/* Room Header */}
			<div className="flex items-center bg-gray-50 border-r border-gray-200">
				<div className="w-32 sm:w-48 p-2 sm:p-4 font-medium truncate border-r border-gray-200">
					<div className="text-sm font-semibold">{room.room_number}</div>
					<div className="text-xs text-gray-500 truncate">{room.room_type}</div>
				</div>
			</div>

			{/* Room Calendar Row */}
			<div className="flex">
				<div className="w-32 sm:w-48 p-2 sm:p-4 bg-gray-50 border-r border-gray-200 flex items-center">
					<span className="text-xs text-gray-600">
						{getCurrencySymbol(room.currency)}
						{room.base_price}/night
					</span>
				</div>
				<div className="flex-1 flex">
					{calendarDays.map((day, dayIndex) => {
						// Find booking that starts on this day
						const bookingStartingToday = roomBookings.find(
							(booking) => booking.span.startIndex === dayIndex,
						);

						// Check if this day is occupied by any booking
						const isOccupied = roomBookings.some(
							(booking) =>
								dayIndex >= booking.span.startIndex &&
								dayIndex < booking.span.startIndex + booking.span.spanDays,
						);

						return (
							<div
								key={dayIndex}
								className={cn(
									"h-12 sm:h-16 border-r border-gray-200 relative flex items-center justify-center",
									isOccupied && !bookingStartingToday && "bg-gray-50",
								)}
							>
								{bookingStartingToday && (
									<div
										className={cn(
											"absolute inset-0 rounded-lg text-white text-xs px-1 sm:px-2 cursor-pointer transition-all z-10 border border-white/20 flex flex-col justify-between overflow-hidden",
											getStatusColor(bookingStartingToday.status),
										)}
										style={{
											width: `calc(${bookingStartingToday.span.spanDays * 100}% + ${(bookingStartingToday.span.spanDays - 1) * 1}px)`,
											minWidth: isMobile
												? `${bookingStartingToday.span.spanDays * 48}px`
												: `${bookingStartingToday.span.spanDays * 38}px`,
										}}
										onClick={() => onBookingClick(bookingStartingToday)}
										title={`${bookingStartingToday.guest_name} - ${bookingStartingToday.status} (${format(parseISO(bookingStartingToday.check_in_date), "MMM dd")} - ${format(parseISO(bookingStartingToday.check_out_date), "MMM dd")})${bookingStartingToday.status === "tentative" || bookingStartingToday.status === "pending" ? " - Click to make payment" : ""}`}
									>
										<div className="font-semibold truncate text-xs py-1">
											<span className="hidden sm:inline">
												#{bookingStartingToday.reservation_number.slice(
													-4,
												)}{" "}
											</span>
											{isMobile
												? bookingStartingToday.guest_name
														.split(" ")[0]
														.slice(0, 6)
												: `${bookingStartingToday.guest_name.split(" ")[0]}`}
										</div>
										{bookingStartingToday.span.spanDays > 2 && !isMobile && (
											<div className="text-xs opacity-90 flex items-center gap-1 pb-1">
												<span className="truncate">
													{bookingStartingToday.guest_name
														.split(" ")
														.slice(1)
														.join(" ")}
												</span>
												{(bookingStartingToday.status === "tentative" ||
													bookingStartingToday.status === "pending") && (
													<span className="text-yellow-200 font-bold">💳</span>
												)}
											</div>
										)}
										{bookingStartingToday.span.spanDays > 4 && !isMobile && (
											<div className="text-xs opacity-75 pb-1">
												{getCurrencySymbol(bookingStartingToday.currency)}
												{bookingStartingToday.total_amount.toLocaleString()}
											</div>
										)}
										{(bookingStartingToday.status === "tentative" ||
											bookingStartingToday.status === "pending") &&
											isMobile && (
												<div className="text-yellow-200 text-xs">💳</div>
											)}
									</div>
								)}

								{!isOccupied && (
									<button
										className="w-full h-full hover:bg-blue-50 transition-colors flex items-center justify-center group"
										onClick={() => onQuickBook(room, day)}
										title={`Book ${room.room_number} for ${format(day, "MMM dd, yyyy")}`}
									>
										<Plus className="size-3 sm:size-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
									</button>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
