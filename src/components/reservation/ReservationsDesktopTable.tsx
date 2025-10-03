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
import { ReservationActions } from "./ReservationActions";
import { ReservationExpensesDisplay } from "./ReservationExpensesDisplay";

type ReservationWithJoins = {
	id: string;
	reservation_number: string;
	location_id: string;
	room_id: string;
	guest_name: string;
	guest_email?: string | null;
	guest_phone?: string | null;
	guest_address?: string | null;
	guest_id_number?: string | null;
	guest_nationality?: string | null;
	adults: number;
	children: number;
	check_in_date: string;
	check_out_date: string;
	nights: number;
	room_rate: number;
	total_amount: number;
	advance_amount?: number | null;
	paid_amount?: number | null;
	balance_amount?: number | null;
	currency: "LKR" | "USD" | "EUR" | "GBP";
	status: "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "tentative";
	special_requests?: string | null;
	arrival_time?: string | null;
	created_by?: string | null;
	grc_approved: boolean;
	grc_approved_by?: string | null;
	grc_approved_at?: string | null;
	created_at: string;
	updated_at: string;
	tenant_id?: string | null;
	guide_id?: string | null;
	agent_id?: string | null;
	guide_commission?: number | null;
	agent_commission?: number | null;
	booking_source: string;
	locations: {
		id: string;
		name: string;
		address: string | null;
		phone: string | null;
		email: string | null;
		property_type: string | null;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
	} | null;
	rooms: {
		id: string;
		room_number: string;
		room_type: string;
		bed_type: string;
		description: string | null;
		amenities: string[] | null;
		base_price: number;
		max_occupancy: number;
		property_type: string;
		currency: string;
		location_id: string;
		tenant_id: string;
		is_active: boolean;
		created_at: string;
		updated_at: string;
	} | null;
	guides?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		address: string | null;
		license_number: string | null;
		is_active: boolean;
	} | null;
	agents?: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		agency_name: string | null;
		is_active: boolean;
	} | null;
};

type IncomeRecord = {
	id: string;
	booking_id: string | null;
	amount: number;
	payment_method: string;
	currency: string;
};

interface ReservationsDesktopTableProps {
	reservations: ReservationWithJoins[];
	incomeRecords: IncomeRecord[];
	onViewReservation: (id: string) => void;
	onEditReservation: (reservation: ReservationWithJoins) => void;
	onPayment: (reservationId: string, amount: number, currency: string) => void;
	getStatusColor: (status: string) => string;
	getCurrencySymbol: (currency: string) => string;
	canShowPaymentButton: (reservation: ReservationWithJoins) => boolean;
	getTotalPayableAmount: (reservation: ReservationWithJoins) => number;
}

export function ReservationsDesktopTable({
	reservations,
	incomeRecords,
	onViewReservation,
	onEditReservation,
	onPayment,
	getStatusColor,
	getCurrencySymbol,
	canShowPaymentButton,
	getTotalPayableAmount,
}: ReservationsDesktopTableProps) {
	return (
		<div className="hidden lg:block">
			<Card>
				<CardHeader>
					<CardTitle>Reservations</CardTitle>
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
							{reservations.map((reservation) => (
								<TableRow key={reservation.id}>
									<TableCell className="font-medium">
										{reservation.reservation_number}
									</TableCell>
									<TableCell>{reservation.guest_name}</TableCell>
									<TableCell>
										{reservation.rooms?.room_number} - {reservation.rooms?.room_type}
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
											incomeRecords={incomeRecords}
											getCurrencySymbol={getCurrencySymbol}
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