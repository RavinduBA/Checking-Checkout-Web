import { useState } from "react";
import { useNavigate } from "react-router";
import {
	CalendarNavigation,
	FullCalendarMonthView,
	QuickBookDialog,
} from "@/components/calendar";
import { PermissionRoute } from "@/components/PermissionRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
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
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [isQuickBookDialogOpen, setIsQuickBookDialogOpen] = useState(false);

	// Status color helpers
	const getStatusColor = (status: string) => {
		switch (status) {
			case "confirmed":
				return "text-green-500 hover:text-green-600";
			case "tentative":
				return "text-yellow-500 hover:text-yellow-600";
			case "pending":
				return "text-blue-500 hover:text-blue-600";
			case "checked_in":
				return "text-purple-500 hover:text-purple-600";
			case "checked_out":
				return "text-gray-500 hover:text-gray-600";
			case "cancelled":
				return "text-red-500 hover:text-red-600";
			default:
				return "text-gray-500 hover:text-gray-600";
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
				{/* Header */}
				<div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
					<div>
						<h1 className="text-2xl font-bold">Calendar</h1>
						<p className="text-sm text-muted-foreground">
							Monthly calendar view with reservation details
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Button
							onClick={() => navigate("/reservations/new")}
							className="gap-2"
						>
							<Plus className="size-4" />
							New Reservation
						</Button>
					</div>
				</div>

				{/* Filters */}
				<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
						<Input
							placeholder="Search reservations..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full sm:w-48">
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="confirmed">Confirmed</SelectItem>
							<SelectItem value="tentative">Tentative</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="checked_in">Checked In</SelectItem>
							<SelectItem value="checked_out">Checked Out</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<CalendarNavigation
					currentDate={currentDate}
					onDateChange={setCurrentDate}
				/>

				<FullCalendarMonthView
					currentDate={currentDate}
					searchTerm={searchTerm}
					statusFilter={statusFilter}
					roomFilter="all"
					onBookingClick={handleBookingClick}
					onQuickBook={handleQuickBook}
					getStatusColor={getStatusColor}
					getStatusBorderColor={getStatusBorderColor}
					getCurrencySymbol={getCurrencySymbol}
				/>

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
