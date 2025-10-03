import { useState } from "react";
import { useNavigate } from "react-router";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { OTPVerification } from "@/components/OTPVerification";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";
import { PaymentsTable } from "@/components/reservation/PaymentsTable";
import { ReservationsDesktopTable } from "@/components/reservation/ReservationsDesktopTable";
import { ReservationsFilters } from "@/components/reservation/ReservationsFilters";
import { ReservationsHeader } from "@/components/reservation/ReservationsHeader";
import { ReservationsMobileCards } from "@/components/reservation/ReservationsMobileCards";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ViewReservationDialog } from "@/components/ViewReservationDialog";
import { useLocationContext } from "@/context/LocationContext";
import { useReservationsData } from "@/hooks/useReservationsData";

export default function Reservations() {
	const { locations } = useLocationContext();
	const { refetch } = useReservationsData();
	const navigate = useNavigate();

	// State for filters
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [activeTab, setActiveTab] = useState("reservations");

	// State for dialogs
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] =
		useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewingReservationId, setViewingReservationId] = useState<
		string | null
	>(null);
	const [editingReservation, setEditingReservation] = useState<any | null>(
		null,
	);

	// State for OTP verification
	const [showOTPVerification, setShowOTPVerification] = useState(false);
	const [otpData, setOtpData] = useState<{
		phoneNumber: string;
		reservationId: string;
		amount: number;
		currency: string;
	} | null>(null);

	// Event handlers
	const handleViewReservation = (id: string) => {
		setViewingReservationId(id);
		setIsViewDialogOpen(true);
	};

	const handleEditReservation = (reservation: any) => {
		setEditingReservation(reservation);
		setIsEditDialogOpen(true);
	};

	const handlePayment = (
		reservationId: string,
		amount: number,
		currency: string,
	) => {
		// For now, navigate directly to payment form
		// TODO: Add OTP verification logic if needed
		navigate(
			`/payment-form?reservationId=${reservationId}&amount=${amount}&currency=${currency}`,
		);
	};

	const handleOTPVerified = () => {
		if (otpData) {
			navigate(
				`/payment-form?reservationId=${otpData.reservationId}&amount=${otpData.amount}&currency=${otpData.currency}`,
			);
		}
		setShowOTPVerification(false);
		setOtpData(null);
	};

	const handleDataUpdate = () => {
		refetch();
	};

	return (
		<div className="max-w-full w-full pb-20 sm:pb-0">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
				<ReservationsHeader activeTab={activeTab} onTabChange={setActiveTab} />

				<div className="container mx-auto px-6">
					<ReservationsFilters
						locations={locations}
						selectedLocation=""
						searchQuery={searchQuery}
						statusFilter={statusFilter}
						onLocationChange={() => {
							// Location switching handled by LocationContext
						}}
						onSearchChange={setSearchQuery}
						onStatusFilterChange={setStatusFilter}
						onNewReservation={() => setIsNewReservationDialogOpen(true)}
					/>

					<TabsContent value="reservations" className="space-y-4">
						<ReservationsMobileCards
							searchQuery={searchQuery}
							statusFilter={statusFilter}
							onViewReservation={handleViewReservation}
							onEditReservation={handleEditReservation}
							onPayment={handlePayment}
						/>

						<ReservationsDesktopTable
							searchQuery={searchQuery}
							statusFilter={statusFilter}
							onViewReservation={handleViewReservation}
							onEditReservation={handleEditReservation}
							onPayment={handlePayment}
						/>
					</TabsContent>

					<TabsContent value="payments" className="space-y-4">
						<PaymentsTable />
					</TabsContent>
				</div>
			</Tabs>

			{/* Dialogs */}
			{showOTPVerification && otpData && (
				<Dialog
					open={showOTPVerification}
					onOpenChange={(open) => {
						if (!open) {
							setShowOTPVerification(false);
							setOtpData(null);
						}
					}}
				>
					<DialogContent>
						<OTPVerification
							phoneNumber={otpData.phoneNumber}
							onVerified={handleOTPVerified}
							triggerComponent={<div />}
						/>
					</DialogContent>
				</Dialog>
			)}

			{editingReservation && (
				<ReservationEditDialog
					isOpen={isEditDialogOpen}
					reservation={editingReservation}
					onClose={() => {
						setIsEditDialogOpen(false);
						setEditingReservation(null);
					}}
					onUpdate={() => {
						handleDataUpdate();
						setIsEditDialogOpen(false);
						setEditingReservation(null);
					}}
				/>
			)}

			<NewReservationDialog
				isOpen={isNewReservationDialogOpen}
				onClose={() => setIsNewReservationDialogOpen(false)}
				onReservationCreated={() => {
					handleDataUpdate();
					setIsNewReservationDialogOpen(false);
				}}
			/>

			<ViewReservationDialog
				isOpen={isViewDialogOpen}
				onClose={() => {
					setIsViewDialogOpen(false);
					setViewingReservationId(null);
				}}
				reservationId={viewingReservationId || ""}
			/>
		</div>
	);
}
