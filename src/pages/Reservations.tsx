import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ReservationsHeader } from "@/components/reservation/ReservationsHeader";
import { ReservationsFilters } from "@/components/reservation/ReservationsFilters";
import { ReservationsMobileCards } from "@/components/reservation/ReservationsMobileCards";
import { ReservationsDesktopTable } from "@/components/reservation/ReservationsDesktopTable";
import { PaymentsTable } from "@/components/reservation/PaymentsTable";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { OTPVerification } from "@/components/OTPVerification";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import { TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ViewReservationDialog } from "@/components/ViewReservationDialog";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

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
	created_at: string;
	date: string;
	note?: string | null;
};

export const Reservations = () => {
	const { user } = useAuth();
	const { selectedLocation, locations } = useLocationContext();
	const { toast } = useToast();
	const navigate = useNavigate();

	// State for data
	const [reservations, setReservations] = useState<ReservationWithJoins[]>([]);
	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);

	// State for filters
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [activeTab, setActiveTab] = useState("reservations");

	// State for dialogs
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] = useState(false);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
	const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);
	const [editingReservation, setEditingReservation] = useState<ReservationWithJoins | null>(null);

	// State for OTP verification
	const [showOTPVerification, setShowOTPVerification] = useState(false);
	const [otpData, setOtpData] = useState<{
		phoneNumber: string;
		reservationId: string;
		amount: number;
		currency: string;
	} | null>(null);

	// Fetch data function
	const fetchData = useCallback(async () => {
		if (!selectedLocation || !user) return;

		try {
			setLoading(true);

			// Fetch reservations
			const { data: reservationsData, error: reservationsError } = await supabase
				.from("reservations")
				.select(`
					*,
					locations(id, name, address, phone, email, property_type, tenant_id, is_active, created_at),
					rooms(id, room_number, room_type, bed_type, description, amenities, base_price, max_occupancy, property_type, currency, location_id, tenant_id, is_active, created_at, updated_at),
					guides(id, name, phone, email, address, license_number, is_active),
					agents(id, name, phone, email, agency_name, is_active)
				`)
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (reservationsError) throw reservationsError;

			// Fetch income records
			const { data: incomeData, error: incomeError } = await supabase
				.from("income")
				.select("id, booking_id, amount, payment_method, currency, created_at, date, note")
				.eq("location_id", selectedLocation)
				.order("created_at", { ascending: false });

			if (incomeError) throw incomeError;

			setReservations(reservationsData || []);
			setIncomeRecords(incomeData || []);
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to fetch reservations data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [selectedLocation, user, toast]);

	// Effect to fetch data when location changes
	useEffect(() => {
		fetchData();
	}, [fetchData]);

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

	const canShowPaymentButton = (reservation: ReservationWithJoins): boolean => {
		return reservation.status !== "cancelled" && reservation.status !== "checked_out";
	};

	const getTotalPayableAmount = (reservation: ReservationWithJoins): number => {
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
			reservation.reservation_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			reservation.guest_name?.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesStatus = statusFilter === "all" || reservation.status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	// Event handlers
	const handleViewReservation = (id: string) => {
		setViewingReservationId(id);
		setIsViewDialogOpen(true);
	};

	const handleEditReservation = (reservation: ReservationWithJoins) => {
		setEditingReservation(reservation);
		setIsEditDialogOpen(true);
	};

	const handlePayment = (reservationId: string, amount: number, currency: string) => {
		const reservation = reservations.find((r) => r.id === reservationId);
		if (!reservation?.guest_phone) {
			navigate(`/payment-form?reservationId=${reservationId}&amount=${amount}&currency=${currency}`);
			return;
		}

		setOtpData({
			phoneNumber: reservation.guest_phone,
			reservationId,
			amount,
			currency,
		});
		setShowOTPVerification(true);
	};

	const handleOTPVerified = () => {
		if (otpData) {
			navigate(`/payment-form?reservationId=${otpData.reservationId}&amount=${otpData.amount}&currency=${otpData.currency}`);
		}
		setShowOTPVerification(false);
		setOtpData(null);
	};

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="max-w-full w-full pb-20 sm:pb-0">
			<ReservationsHeader activeTab={activeTab} onTabChange={setActiveTab} />

			<div className="container mx-auto px-6">
				<ReservationsFilters
					locations={locations}
					selectedLocation={selectedLocation}
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
						reservations={filteredReservations}
						incomeRecords={incomeRecords}
						onViewReservation={handleViewReservation}
						onEditReservation={handleEditReservation}
						onPayment={handlePayment}
						getStatusColor={getStatusColor}
						getCurrencySymbol={getCurrencySymbol}
						canShowPaymentButton={canShowPaymentButton}
						getTotalPayableAmount={getTotalPayableAmount}
					/>

					<ReservationsDesktopTable
						reservations={filteredReservations}
						incomeRecords={incomeRecords}
						onViewReservation={handleViewReservation}
						onEditReservation={handleEditReservation}
						onPayment={handlePayment}
						getStatusColor={getStatusColor}
						getCurrencySymbol={getCurrencySymbol}
						canShowPaymentButton={canShowPaymentButton}
						getTotalPayableAmount={getTotalPayableAmount}
					/>
				</TabsContent>

				<PaymentsTable
					incomeRecords={incomeRecords}
					onRefresh={fetchData}
					getCurrencySymbol={getCurrencySymbol}
				/>
			</div>

			{/* Dialogs */}
			{showOTPVerification && otpData && (
				<Dialog open={showOTPVerification} onOpenChange={(open) => {
					if (!open) {
						setShowOTPVerification(false);
						setOtpData(null);
					}
				}}>
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
						fetchData();
						setIsEditDialogOpen(false);
						setEditingReservation(null);
					}}
				/>
			)}

			<NewReservationDialog
				isOpen={isNewReservationDialogOpen}
				onClose={() => setIsNewReservationDialogOpen(false)}
				onReservationCreated={() => {
					fetchData();
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
};