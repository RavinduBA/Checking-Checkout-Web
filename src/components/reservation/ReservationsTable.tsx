import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];

interface ReservationsTableProps {
	reservations: Reservation[];
	rooms: Room[];
	reservationIncomeMap: Record<string, boolean>;
	onAddIncome: (reservation: Reservation) => void;
}

export function ReservationsTable({
	reservations,
	rooms,
	reservationIncomeMap,
	onAddIncome,
}: ReservationsTableProps) {
	const getStatusBadge = (status: string) => {
		const variants: Record<
			string,
			"default" | "secondary" | "destructive" | "outline"
		> = {
			tentative: "outline",
			confirmed: "default",
			checked_in: "secondary",
			checked_out: "destructive",
			cancelled: "destructive",
		};
		return (
			<Badge variant={variants[status] || "default"}>
				{status.charAt(0).toUpperCase() + status.slice(1)}
			</Badge>
		);
	};

	const isAddIncomeDisabled = (reservation: Reservation) => {
		// Disable if status is confirmed (payment completed)
		if (reservation.status === "confirmed") {
			return true;
		}
		// Disable if income already exists for this reservation
		if (reservationIncomeMap[reservation.id]) {
			return true;
		}
		return false;
	};

	const getDisabledReason = (reservation: Reservation) => {
		if (reservation.status === "confirmed") {
			return "Income cannot be added - reservation is confirmed (payment completed)";
		}
		if (reservationIncomeMap[reservation.id]) {
			return "Income already recorded for this reservation";
		}
		return "";
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Reservations - Add Income</CardTitle>
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
							<TableHead>Total Amount</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Action</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reservations.map((reservation) => {
							const room = rooms.find((r) => r.id === reservation.room_id);
							return (
								<TableRow key={reservation.id}>
									<TableCell className="font-medium">
										{reservation.reservation_number}
									</TableCell>
									<TableCell>{reservation.guest_name}</TableCell>
									<TableCell>
										{room?.room_number} - {room?.room_type}
									</TableCell>
									<TableCell>
										{new Date(reservation.check_in_date).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{new Date(
											reservation.check_out_date,
										).toLocaleDateString()}
									</TableCell>
									<TableCell>
										LKR {reservation.total_amount.toLocaleString()}
									</TableCell>
									<TableCell>{getStatusBadge(reservation.status)}</TableCell>
									<TableCell>
										<Button
											variant="outline"
											size="sm"
											disabled={isAddIncomeDisabled(reservation)}
											title={getDisabledReason(reservation)}
											onClick={() => onAddIncome(reservation)}
										>
											<DollarSign className="size-4 mr-1" />
											Add Income
										</Button>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}