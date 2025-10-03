import { Calendar, DollarSign, MapPin } from "lucide-react";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
	type IncomeRecord,
	type ReservationWithJoins,
	useIncomeData,
	useReservationsData,
} from "@/hooks/useReservationsData";
import { ReservationActions } from "./ReservationActions";
import { ReservationExpensesDisplay } from "./ReservationExpensesDisplay";

interface ReservationsMobileCardsProps {
	searchQuery: string;
	statusFilter: string;
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: any) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	onAddIncome: (reservation: any) => void;
}

export function ReservationsMobileCards({
	searchQuery,
	statusFilter,
	onViewReservation,
	onEditReservation,
	onPayment,
	onAddIncome,
}: ReservationsMobileCardsProps) {
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
		<div className="lg:hidden grid gap-4">
			{filteredReservations.map((reservation) => (
				<Card key={reservation.id} className="w-full">
					<CardContent className="p-4">
						<div className="flex justify-between items-start mb-3">
							<div>
								<h3 className="font-semibold text-sm">
									{reservation.reservation_number}
								</h3>
								<p className="text-muted-foreground text-xs">
									{reservation.guest_name}
								</p>
							</div>
							<Badge
								className={`${getStatusColor(reservation.status)} text-xs`}
							>
								{reservation.status}
							</Badge>
						</div>

						<div className="space-y-2 text-xs">
							<div className="flex items-center gap-2">
								<MapPin className="h-3 w-3" />
								<span>
									{reservation.rooms?.room_number} -{" "}
									{reservation.rooms?.room_type}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<Calendar className="h-3 w-3" />
								<span>
									{new Date(reservation.check_in_date).toLocaleDateString()} -{" "}
									{new Date(reservation.check_out_date).toLocaleDateString()}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<DollarSign className="h-3 w-3" />
								<span>
									Room: {getCurrencySymbol(reservation.currency)}{" "}
									{reservation.total_amount.toLocaleString()}
								</span>
							</div>

							{/* Expenses display */}
							{(() => {
								const totalExpenses = incomeRecords
									.filter((inc) => inc.booking_id === reservation.id)
									.reduce((sum, inc) => sum + Number(inc.amount), 0);

								if (totalExpenses > 0) {
									return (
										<div className="flex items-center gap-2">
											<DollarSign className="h-3 w-3" />
											<ReservationExpensesDisplay
												reservationId={reservation.id}
												currency={reservation.currency}
												isCompact={true}
											/>
										</div>
									);
								}
								return null;
							})()}
						</div>

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
							isMobile={true}
						/>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
