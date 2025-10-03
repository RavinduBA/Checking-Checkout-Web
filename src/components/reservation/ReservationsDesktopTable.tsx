import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type IncomeRecord,
	type ReservationWithJoins,
	useIncomeData,
	useReservationsData,
} from "@/hooks/useReservationsData";
import { ReservationActions } from "./ReservationActions";
import { ReservationExpensesDisplay } from "./ReservationExpensesDisplay";

interface ReservationsDesktopTableProps {
	searchQuery: string;
	statusFilter: string;
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: any) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	onAddIncome: (reservation: any) => void;
}

export function ReservationsDesktopTable({
	searchQuery,
	statusFilter,
	onViewReservation,
	onEditReservation,
	onPayment,
	onAddIncome,
}: ReservationsDesktopTableProps) {
	const { reservations, loading } = useReservationsData();
	const { incomeRecords } = useIncomeData();

	// Utility functions
	const getCurrencySymbol = (currency: string): string => {
		const symbols: Record<string, string> = {
			LKR: "Rs.",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency] || currency;
	};

	const getStatusColor = (status: string): string => {
		const colors: Record<string, string> = {
			confirmed: "bg-green-100 text-green-800",
			pending: "bg-yellow-100 text-yellow-800",
			cancelled: "bg-red-100 text-red-800",
			checked_in: "bg-blue-100 text-blue-800",
			checked_out: "bg-gray-100 text-gray-800",
			tentative: "bg-orange-100 text-orange-800",
		};
		return colors[status] || "bg-gray-100 text-gray-800";
	};

	const canShowPaymentButton = (reservation: any): boolean => {
		return (
			reservation.status !== "cancelled" && reservation.status !== "checked_out"
		);
	};

	const getTotalPayableAmount = (reservation: any): number => {
		const roomAmount = reservation.total_amount;
		const expenses = incomeRecords
			.filter((inc) => inc.booking_id === reservation.id)
			.reduce((sum, inc) => sum + Number(inc.amount), 0);
		return roomAmount + expenses;
	};

	// Filter reservations
	const filteredReservations = reservations.filter((reservation) => {
		const matchesSearch =
			searchQuery === "" ||
			reservation.reservation_number
				?.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			reservation.guest_name?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus =
			statusFilter === "all" || reservation.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	if (loading) {
		return <ReservationsListSkeleton />;
	}
	return (
		<div className="hidden lg:block">
			<Card>
				<CardHeader>
					<CardTitle className="px-4 text-sm font-medium">Reservations</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reservation #</TableHead>
								<TableHead>Guest</TableHead>
								<TableHead>Room</TableHead>
								<TableHead>Check-in</TableHead>
								<TableHead>Check-out</TableHead>
								<TableHead>Room Amount</TableHead>
								<TableHead>Expenses</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredReservations.map((reservation) => (
								<TableRow key={reservation.id}>
									<TableCell className="font-medium">
										{reservation.reservation_number}
									</TableCell>
									<TableCell>{reservation.guest_name}</TableCell>
									<TableCell>
										{reservation.rooms?.room_number} -{" "}
										{reservation.rooms?.room_type}
									</TableCell>
									<TableCell>
										{new Date(reservation.check_in_date).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{new Date(reservation.check_out_date).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{getCurrencySymbol(reservation.currency)}{" "}
										{reservation.total_amount.toLocaleString()}
									</TableCell>
									<TableCell>
										<ReservationExpensesDisplay
											reservationId={reservation.id}
											currency={reservation.currency}
										/>
									</TableCell>
									<TableCell>
										<Badge className={getStatusColor(reservation.status)}>
											{reservation.status}
										</Badge>
									</TableCell>
									<TableCell>
										<ReservationActions
											reservation={reservation}
											onView={() => onViewReservation(reservation.id)}
											onEdit={() => onEditReservation(reservation)}
											onPayment={() =>
												onPayment(
													reservation.id,
													getTotalPayableAmount(reservation),
													reservation.currency,
												)
											}
											onAddIncome={() => onAddIncome(reservation)}
											canShowPayment={canShowPaymentButton(reservation)}
											isMobile={false}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
