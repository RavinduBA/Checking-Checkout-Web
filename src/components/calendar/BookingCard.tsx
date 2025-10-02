import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"] & {
	rooms: { room_number: string; room_type: string } | null;
	locations: { name: string } | null;
};

interface BookingCardProps {
	reservation: Reservation;
	getCurrencySymbol: (currency: string) => string;
	getStatusColor: (status: string) => string;
	getStatusBorderColor: (status: string) => string;
}

export function BookingCard({
	reservation,
	getCurrencySymbol,
	getStatusColor,
	getStatusBorderColor,
}: BookingCardProps) {
	const navigate = useNavigate();

	return (
		<Card
			className="cursor-pointer hover:transition-all duration-200 border-l-4"
			style={{
				borderLeftColor: getStatusBorderColor(reservation.status),
			}}
		>
			<CardContent className="p-4">
				<div className="flex justify-between items-start mb-3">
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-base truncate flex items-center gap-2">
							{reservation.guest_name}
							{(reservation.status === "tentative" ||
								reservation.status === "pending") && (
								<Clock className="size-4 text-orange-500 animate-pulse" />
							)}
						</h3>
						<p className="text-sm text-muted-foreground">
							#{reservation.reservation_number}
						</p>
					</div>
					<Badge
						className={cn(
							"text-white text-xs shrink-0 ml-2",
							getStatusColor(reservation.status),
						)}
					>
						{reservation.status}
					</Badge>
				</div>

				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="font-medium min-w-0">Room:</span>
						<span className="truncate">
							{reservation.rooms?.room_number} - {reservation.rooms?.room_type}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="font-medium">Location:</span>
						<span className="truncate">{reservation.locations?.name}</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span className="font-medium">Dates:</span>
						<span>
							{format(parseISO(reservation.check_in_date), "MMM dd")} -{" "}
							{format(parseISO(reservation.check_out_date), "MMM dd, yyyy")}
						</span>
					</div>
					<div className="flex justify-between items-center pt-2 border-t border-gray-100">
						<span className="text-lg font-bold text-primary">
							{getCurrencySymbol(reservation.currency)}
							{reservation.total_amount.toLocaleString()}
						</span>
						<div className="flex gap-2">
							{(reservation.status === "tentative" ||
								reservation.status === "pending") && (
								<Button
									variant="default"
									size="sm"
									onClick={(e) => {
										e.stopPropagation();
										navigate(`/payments/new?reservation=${reservation.id}`);
									}}
									className="bg-green-600 hover:bg-green-700 gap-1 text-xs px-3"
								>
									💳 Pay Now
								</Button>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={(e) => {
									e.stopPropagation();
									navigate(`/reservations/${reservation.id}`);
								}}
								className="text-xs px-3"
							>
								View
							</Button>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
