import { CreditCard, Edit, Eye } from "lucide-react";
import { OTPVerification } from "@/components/OTPVerification";
import { ReservationPrintButton } from "@/components/ReservationPrintButton";
import { Button } from "@/components/ui/button";

type ReservationForActions = {
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
	status:
		| "pending"
		| "confirmed"
		| "checked_in"
		| "checked_out"
		| "cancelled"
		| "tentative";
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
};

interface ReservationActionsProps {
	reservation: ReservationForActions;
	onView: () => void;
	onEdit: () => void;
	onPayment: () => void;
	canShowPayment: boolean;
	isMobile?: boolean;
}

export function ReservationActions({
	reservation,
	onView,
	onEdit,
	onPayment,
	canShowPayment,
	isMobile = false,
}: ReservationActionsProps) {
	if (isMobile) {
		return (
			<div className="flex gap-2 mt-4">
				<Button variant="outline" size="sm" className="flex-1" onClick={onView}>
					<Eye className="size-4 mr-1" />
					View
				</Button>

				<ReservationPrintButton
					reservation={reservation}
					buttonText=""
					buttonVariant="outline"
					buttonSize="sm"
					showIcon={true}
				/>

				{canShowPayment && (
					<Button
						variant="outline"
						size="sm"
						onClick={onPayment}
						className="text-green-600 hover:text-green-700"
					>
						<CreditCard className="size-4" />
					</Button>
				)}

				<OTPVerification
					onVerified={onEdit}
					triggerComponent={
						<Button variant="outline" size="sm">
							<Edit className="size-4" />
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="flex gap-1">
			<Button variant="ghost" size="icon" onClick={onView}>
				<Eye className="size-4" />
			</Button>

			<ReservationPrintButton
				reservation={reservation}
				buttonText=""
				buttonVariant="ghost"
				buttonSize="icon"
				showIcon={true}
			/>

			{canShowPayment && (
				<Button
					variant="ghost"
					size="icon"
					onClick={onPayment}
					className="text-green-600 hover:text-green-700"
				>
					<CreditCard className="size-4" />
				</Button>
			)}

			<OTPVerification
				onVerified={onEdit}
				triggerComponent={
					<Button variant="ghost" size="icon">
						<Edit className="size-4" />
					</Button>
				}
			/>
		</div>
	);
}
