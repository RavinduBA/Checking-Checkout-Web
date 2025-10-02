import {
	Calendar,
	CreditCard,
	DollarSign,
	Edit,
	Eye,
	MapPin,
	Printer,
	User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { NewReservationDialog } from "@/components/NewReservationDialog";
import { OTPVerification } from "@/components/OTPVerification";
import { ReservationEditDialog } from "@/components/ReservationEditDialog";
import { ReservationPrintButton } from "@/components/ReservationPrintButton";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import { ViewReservationDialog } from "@/components/ViewReservationDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type Reservation = ReservationWithJoins;

type Payment = Tables<"payments">;

type IncomeRecord = {
	id: string;
	booking_id: string;
	amount: number;
	payment_method: string;
	currency: string;
};

export const ReservationsList = () => {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { tenant } = useAuth();
	const { selectedLocation, setSelectedLocation, locations } =
		useLocationContext();
	const [reservations, setReservations] = useState<ReservationWithJoins[]>([]);
	const [payments, setPayments] = useState<Payment[]>([]);
	const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [editingReservation, setEditingReservation] =
		useState<Reservation | null>(null);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isNewReservationDialogOpen, setIsNewReservationDialogOpen] = useState(false);
	const [viewingReservationId, setViewingReservationId] = useState<string | null>(null);
	const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

	const fetchData = useCallback(async () => {
		try {
			// Fetch reservations with location and room data
			const reservationsQuery = !selectedLocation
				? supabase
						.from("reservations")
						.select(`
          *,
          locations (
            id,
            name,
            address,
            phone,
            email,
            property_type,
            tenant_id,
            is_active,
            created_at
          ),
          rooms (
            id,
            room_number,
            room_type,
            bed_type,
            description,
            amenities,
            base_price,
            max_occupancy,
            property_type,
            currency,
            location_id,
            tenant_id,
            is_active,
            created_at,
            updated_at
          ),
          guides (
            id,
            name,
            phone,
            email,
            address,
            license_number,
            is_active
          ),
          agents (
            id,
            name,
            phone,
            email,
            agency_name,
            is_active
          )
        `)
						.eq("tenant_id", tenant?.id || "")
						.order("created_at", { ascending: false })
				: supabase
						.from("reservations")
						.select(`
          *,
          locations (
            id,
            name,
            address,
            phone,
            email,
            property_type,
            tenant_id,
            is_active,
            created_at
          ),
          rooms (
            id,
            room_number,
            room_type,
            bed_type,
            description,
            amenities,
            base_price,
            max_occupancy,
            property_type,
            currency,
            location_id,
            tenant_id,
            is_active,
            created_at,
            updated_at
          ),
          guides (
            id,
            name,
            phone,
            email,
            address,
            license_number,
            is_active
          ),
          agents (
            id,
            name,
            phone,
            email,
            agency_name,
            is_active
          )
        `)
						.eq("tenant_id", tenant?.id || "")
						.eq("location_id", selectedLocation)
						.order("created_at", { ascending: false });

			// Fetch payments with location filtering through reservations
			const paymentsQuery = !selectedLocation
				? supabase
						.from("payments")
						.select(`
							*,
							reservations!inner(location_id, tenant_id)
						`)
						.eq("reservations.tenant_id", tenant?.id || "")
						.order("created_at", { ascending: false })
				: supabase
						.from("payments")
						.select(`
							*,
							reservations!inner(location_id, tenant_id)
						`)
						.eq("reservations.tenant_id", tenant?.id || "")
						.eq("reservations.location_id", selectedLocation)
						.order("created_at", { ascending: false });

			// Fetch income records to get pending expenses
			const incomeQuery = !selectedLocation
				? supabase
						.from("income")
						.select(`
							id,
							booking_id,
							amount,
							payment_method,
							currency
						`)
						.eq("tenant_id", tenant?.id || "")
				: supabase
						.from("income")
						.select(`
							id,
							booking_id,
							amount,
							payment_method,
							currency
						`)
						.eq("tenant_id", tenant?.id || "")
						.eq("location_id", selectedLocation);

			const [reservationsData, paymentsData, incomeData] = await Promise.all([
				reservationsQuery,
				paymentsQuery,
				incomeQuery,
			]);

			setReservations((reservationsData.data as ReservationWithJoins[]) || []);
			setPayments(paymentsData.data || []);
			setIncomeRecords(incomeData.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
		} finally {
			setLoading(false);
		}
	}, [selectedLocation, tenant?.id]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const getStatusColor = (status: string) => {
		const colors = {
			confirmed: "bg-emerald-100 text-emerald-800 border-emerald-200",
			tentative: "bg-amber-100 text-amber-800 border-amber-200",
			pending: "bg-orange-100 text-orange-800 border-border",
			checked_in: "bg-blue-100 text-blue-800 border-blue-200",
			checked_out: "bg-gray-100 text-gray-800 border-gray-200",
			cancelled: "bg-red-100 text-red-800 border-red-200",
		};
		return (
			colors[status as keyof typeof colors] ||
			"bg-gray-100 text-gray-800 border-gray-200"
		);
	};

	const getCurrencySymbol = (currency: string) => {
		const symbols = {
			LKR: "LKR",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency as keyof typeof symbols] || currency;
	};

	const handleOTPVerified = (reservationId: string) => {
		const reservation = reservations.find((r) => r.id === reservationId);
		if (reservation) {
			setEditingReservation(reservation);
			setIsEditDialogOpen(true);
		}
		toast({
			title: "Verification Successful",
			description: "You can now edit this reservation.",
		});
	};

	const getPendingExpenses = (reservationId: string) => {
		return incomeRecords
			.filter(
				(inc) =>
					inc.booking_id === reservationId && inc.payment_method === "pending",
			)
			.reduce((sum, inc) => sum + Number(inc.amount), 0);
	};

	const getTotalPayableAmount = (reservation: Reservation) => {
		const roomBalance = reservation.balance_amount || 0;
		const pendingExpenses = getPendingExpenses(reservation.id);

		// If room is fully paid (balance = 0), only return pending expenses
		// If room has balance, return room balance + pending expenses
		return roomBalance + pendingExpenses;
	};

	const canShowPaymentButton = (reservation: Reservation) => {
		// Show payment button if there are any amounts to pay
		const totalPayable = getTotalPayableAmount(reservation);
		const isPayableStatus = ["tentative", "pending", "confirmed"].includes(
			reservation.status,
		);

		return isPayableStatus && totalPayable > 0;
	};

	const filteredReservations = reservations.filter((reservation) => {
		const matchesLocation =
			!selectedLocation || reservation.location_id === selectedLocation;
		const matchesSearch =
			searchQuery === "" ||
			reservation.guest_name
				.toLowerCase()
				.includes(searchQuery.toLowerCase()) ||
			reservation.reservation_number
				.toLowerCase()
				.includes(searchQuery.toLowerCase());
		const matchesStatus =
			statusFilter === "all" || reservation.status === statusFilter;

		return matchesLocation && matchesSearch && matchesStatus;
	});

	const filteredPayments = payments.filter((payment) => {
		const matchesSearch =
			searchQuery === "" ||
			payment.payment_number?.toLowerCase().includes(searchQuery.toLowerCase());

		return matchesSearch;
	});

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="max-w-full w-full pb-20 sm:pb-0 mx-auto p-4 space-y-6">
			<div className="flex flex-col gap-4">
				<h1 className="text-md sm:text-2xl font-bold">
					Reservations & Payments
				</h1>

				{/* Filters */}
				<div className="flex flex-col lg:flex-row gap-4">
					{locations.length > 1 && (
						<Select
							value={selectedLocation}
							onValueChange={setSelectedLocation}
						>
							<SelectTrigger className="w-full lg:w-48">
								<SelectValue placeholder="Select location" />
							</SelectTrigger>
							<SelectContent className="z-50 bg-background border">
								{locations.map((location) => (
									<SelectItem key={location.id} value={location.id}>
										{location.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}{" "}
					<Input
						placeholder="Search reservations..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full lg:w-64"
					/>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full lg:w-48">
							<SelectValue placeholder="Filter by status" />
						</SelectTrigger>
						<SelectContent className="z-50 bg-background border">
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="confirmed">Confirmed</SelectItem>
							<SelectItem value="tentative">Tentative</SelectItem>
							<SelectItem value="pending">Pending</SelectItem>
							<SelectItem value="checked_in">Checked In</SelectItem>
							<SelectItem value="checked_out">Checked Out</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
					<Button onClick={() => setIsNewReservationDialogOpen(true)}>
						<Calendar className="size-4 mr-2" />
						New Reservation
					</Button>
				</div>
			</div>

			<Tabs defaultValue="reservations" className="w-full">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="reservations">Reservations</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
				</TabsList>

				<TabsContent value="reservations" className="space-y-4">
					{/* Desktop Table View */}
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
													{new Date(
														reservation.check_in_date,
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													{new Date(
														reservation.check_out_date,
													).toLocaleDateString()}
												</TableCell>
												<TableCell>
													{getCurrencySymbol(reservation.currency)}{" "}
													{reservation.total_amount.toLocaleString()}
												</TableCell>
												<TableCell>
													{(() => {
														const pendingExpenses = getPendingExpenses(
															reservation.id,
														);
														const totalExpenses = incomeRecords
															.filter(
																(inc) => inc.booking_id === reservation.id,
															)
															.reduce(
																(sum, inc) => sum + Number(inc.amount),
																0,
															);

														return (
															<div className="text-sm">
																{totalExpenses > 0 ? (
																	<div className="space-y-1">
																		<div className="font-medium">
																			{getCurrencySymbol(reservation.currency)}{" "}
																			{totalExpenses.toLocaleString()}
																		</div>
																		{pendingExpenses > 0 && (
																			<div className="text-yellow-600 text-xs">
																				Pending:{" "}
																				{getCurrencySymbol(
																					reservation.currency,
																				)}{" "}
																				{pendingExpenses.toLocaleString()}
																			</div>
																		)}
																	</div>
																) : (
																	<span className="text-muted-foreground">
																		-
																	</span>
																)}
															</div>
														);
													})()}
												</TableCell>
												<TableCell>
													<Badge className={getStatusColor(reservation.status)}>
														{reservation.status}
													</Badge>
												</TableCell>
												<TableCell>
													<div className="flex gap-1">
														<Button
															variant="ghost"
															size="icon"
															onClick={() => {
																setViewingReservationId(reservation.id);
																setIsViewDialogOpen(true);
															}}
														>
															<Eye className="size-4" />
														</Button>
														<ReservationPrintButton
															reservation={reservation}
															buttonText=""
															buttonVariant="ghost"
															buttonSize="icon"
															showIcon={true}
														/>
														{canShowPaymentButton(reservation) && (
															<Button
																variant="ghost"
																size="icon"
																onClick={() =>
																	navigate(
																		`/payments/new?reservation=${reservation.id}&amount=${getTotalPayableAmount(reservation)}&currency=${reservation.currency}`,
																	)
																}
																className="text-green-600 hover:text-green-700"
															>
																<CreditCard className="size-4" />
															</Button>
														)}
														<OTPVerification
															onVerified={() =>
																handleOTPVerified(reservation.id)
															}
															triggerComponent={
																<Button variant="ghost" size="icon">
																	<Edit className="size-4" />
																</Button>
															}
														/>
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					{/* Mobile Card View */}
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
												{new Date(
													reservation.check_in_date,
												).toLocaleDateString()}{" "}
												-{" "}
												{new Date(
													reservation.check_out_date,
												).toLocaleDateString()}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<DollarSign className="h-3 w-3" />
											<span>
												Room: {getCurrencySymbol(reservation.currency)}{" "}
												{reservation.total_amount.toLocaleString()}
											</span>
										</div>
										{(() => {
											const pendingExpenses = getPendingExpenses(
												reservation.id,
											);
											const totalExpenses = incomeRecords
												.filter((inc) => inc.booking_id === reservation.id)
												.reduce((sum, inc) => sum + Number(inc.amount), 0);

											if (totalExpenses > 0) {
												return (
													<div className="flex items-center gap-2">
														<DollarSign className="h-3 w-3" />
														<span>
															Expenses:{" "}
															{getCurrencySymbol(reservation.currency)}{" "}
															{totalExpenses.toLocaleString()}
															{pendingExpenses > 0 && (
																<span className="text-yellow-600 ml-2">
																	(Pending:{" "}
																	{getCurrencySymbol(reservation.currency)}{" "}
																	{pendingExpenses.toLocaleString()})
																</span>
															)}
														</span>
													</div>
												);
											}
											return null;
										})()}
									</div>

									<div className="flex gap-2 mt-4">
										<Button
											variant="outline"
											size="sm"
											className="flex-1"
											onClick={() => {
												setViewingReservationId(reservation.id);
												setIsViewDialogOpen(true);
											}}
										>
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
										{canShowPaymentButton(reservation) && (
											<Button
												variant="outline"
												size="sm"
												onClick={() =>
													navigate(
														`/payments/new?reservation=${reservation.id}&amount=${getTotalPayableAmount(reservation)}&currency=${reservation.currency}`,
													)
												}
												className="text-green-600 hover:text-green-700"
											>
												<CreditCard className="size-4" />
											</Button>
										)}
										<OTPVerification
											onVerified={() => handleOTPVerified(reservation.id)}
											triggerComponent={
												<Button variant="outline" size="sm">
													<Edit className="size-4" />
												</Button>
											}
										/>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>

				<TabsContent value="payments" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Recent Payments</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-sm text-muted-foreground mb-4">
								{filteredPayments.length} payments found
							</div>
							{filteredPayments.length > 0 ? (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Payment #</TableHead>
											<TableHead>Amount</TableHead>
											<TableHead>Method</TableHead>
											<TableHead>Date</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredPayments.map((payment) => (
											<TableRow key={payment.id}>
												<TableCell className="font-medium">
													{payment.payment_number}
												</TableCell>
												<TableCell>
													{payment.currency} {payment.amount.toLocaleString()}
												</TableCell>
												<TableCell>{payment.payment_method}</TableCell>
												<TableCell>
													{new Date(payment.created_at).toLocaleDateString()}
												</TableCell>
												<TableCell>
													<Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
														Completed
													</Badge>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							) : (
								<div className="text-center py-8 text-muted-foreground">
									No payments found
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			<ReservationEditDialog
				reservation={editingReservation}
				isOpen={isEditDialogOpen}
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
