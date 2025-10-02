import { useState } from "react";
import { useNavigate } from "react-router";
import {
	CalendarHeader,
	CalendarNavigation,
	GridView,
	QuickBookDialog,
	TimelineView,
} from "@/components/calendar";
import { PermissionRoute } from "@/components/PermissionRoute";
import type { Database } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

export default function EnhancedCalendar() {
	const navigate = useNavigate();
	const [currentDate, setCurrentDate] = useState(new Date());
	const [viewMode, setViewMode] = useState<"timeline" | "grid">("timeline");
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [roomFilter, setRoomFilter] = useState("all");
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [isQuickBookDialogOpen, setIsQuickBookDialogOpen] = useState(false);

	// Status color helpers
	const getStatusColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "bg-green-500 hover:bg-green-600";
			case "tentative":
				return "bg-yellow-500 hover:bg-yellow-600";
			case "pending":
				return "bg-blue-500 hover:bg-blue-600";
			case "checked_in":
				return "bg-purple-500 hover:bg-purple-600";
			case "checked_out":
				return "bg-gray-500 hover:bg-gray-600";
			case "cancelled":
				return "bg-red-500 hover:bg-red-600";
			default:
				return "bg-gray-500 hover:bg-gray-600";
		}
	};

	const getStatusBorderColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "#10b981";
			case "tentative":
				return "#f59e0b";
			case "pending":
				return "#3b82f6";
			case "checked_in":
				return "#8b5cf6";
			case "checked_out":
				return "#6b7280";
			case "cancelled":
				return "#ef4444";
			default:
				return "#6b7280";
		}
	};

	// Event handlers
	const handleBookingClick = (booking: Reservation) => {
		if (booking.status === "tentative" || booking.status === "pending") {
			navigate(`/payments/new?reservation=${booking.id}`);
		} else {
			navigate(`/reservations/${booking.id}`);
		}
	};

	const handleQuickBook = (room: Room, date: Date) => {
		setSelectedRoom(room);
		setSelectedDate(date);
		setIsQuickBookDialogOpen(true);
	};

	const closeQuickBookDialog = () => {
		setIsQuickBookDialogOpen(false);
		setSelectedRoom(null);
		setSelectedDate(null);
	};

	return (
		<PermissionRoute permission={["access_calendar"]}>
			<div className="space-y-6">
				<CalendarHeader
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					searchTerm={searchTerm}
					onSearchTermChange={setSearchTerm}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
					roomFilter={roomFilter}
					onRoomFilterChange={setRoomFilter}
				/>

				<CalendarNavigation
					currentDate={currentDate}
					onDateChange={setCurrentDate}
				/>

				{viewMode === "timeline" ? (
					<TimelineView
						currentDate={currentDate}
						searchTerm={searchTerm}
						statusFilter={statusFilter}
						roomFilter={roomFilter}
						onBookingClick={handleBookingClick}
						onQuickBook={handleQuickBook}
						getStatusColor={getStatusColor}
						getCurrencySymbol={getCurrencySymbol}
					/>
				) : (
					<GridView
						currentDate={currentDate}
						searchTerm={searchTerm}
						statusFilter={statusFilter}
						roomFilter={roomFilter}
						getCurrencySymbol={getCurrencySymbol}
						getStatusColor={getStatusColor}
						getStatusBorderColor={getStatusBorderColor}
					/>
				)}

				<QuickBookDialog
					isOpen={isQuickBookDialogOpen}
					onClose={closeQuickBookDialog}
					selectedRoom={selectedRoom}
					selectedDate={selectedDate}
				/>
			</div>
		</PermissionRoute>
	);
}
