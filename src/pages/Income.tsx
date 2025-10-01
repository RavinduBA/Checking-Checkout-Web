import {
	AlertCircle,
	Calendar,
	CreditCard,
	Edit,
	Eye,
	Plus,
	Printer,
} from "lucide-react";
import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import SignatureCanvas from "react-signature-canvas";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { PhoneInput } from "@/components/ui/phone-input";
import { PhoneVerification } from "@/components/PhoneVerification";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";
import { useIncomeData } from "@/hooks/useIncomeData";
import { supabase } from "@/integrations/supabase/client";

type Database = any;

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Payment = Database["public"]["Tables"]["payments"]["Row"];
type Location = Database["public"]["Tables"]["locations"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type IncomeType = Database["public"]["Tables"]["income_types"]["Row"];
type AdditionalService = Database["public"]["Tables"]["additional_services"]["Row"];

const Income = () => {
	const { toast } = useToast();
	const navigate = useNavigate();
	const sigCanvas = useRef<SignatureCanvas | null>(null);
	const { hasAnyPermission, hasPermission } = usePermissions();
	const { profile, refetch: refetchProfile } = useProfile();

	// Use the custom hook for data fetching
	const { 
		reservations, 
		payments,
		recentPayments, 
		locations, 
		rooms, 
		accounts, 
		loading,
		refetch 
	} = useIncomeData();

	const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
	const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
	const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

	// States for income types and traveler services
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [travelerServices, setTravelerServices] = useState<AdditionalService[]>([]);

	const [paymentForm, setPaymentForm] = useState({
		amount: 0,
		payment_method: "",
		account_id: "",
		payment_number: "",
		notes: "",
	});

	const [serviceForm, setServiceForm] = useState({
		service_type: "",
		reservation_id: "",
		quantity: 1,
		unit_price: 0,
		total_amount: 0,
		service_date: new Date().toISOString().split('T')[0],
		notes: "",
	});

	const calculateNights = (checkIn: string, checkOut: string) => {
		const start = new Date(checkIn);
		const end = new Date(checkOut);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	const handlePaymentSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedReservation) return;

		try {
			// Get count for payment number
			const { data: existingPayments, error: countError } = await supabase
				.from("payments")
				.select("id");

			if (countError) throw countError;

			const currentYear = new Date().getFullYear();
			const paymentNumber = `PAY${currentYear}${String((existingPayments?.length || 0) + 1).padStart(4, "0")}`;

			const paymentData = {
				reservation_id: selectedReservation.id,
				amount: paymentForm.amount,
				payment_method: paymentForm.payment_method,
				payment_type: 'reservation_payment',
				account_id: paymentForm.account_id,
				payment_number: paymentNumber,
				notes: paymentForm.notes || null,
				created_by: profile?.id,
			};

			const { error } = await supabase.from("payments").insert(paymentData);

			if (error) throw error;

			// Update reservation paid amount and balance
			const newPaidAmount = selectedReservation.paid_amount + paymentForm.amount;
			const newBalance = selectedReservation.total_amount - newPaidAmount;

			const { error: updateError } = await supabase
				.from("reservations")
				.update({
					paid_amount: newPaidAmount,
					balance_amount: newBalance,
				})
				.eq("id", selectedReservation.id);

			if (updateError) throw updateError;

			toast({
				title: "Success",
				description: "Payment recorded successfully",
			});

			setIsPaymentDialogOpen(false);
			resetPaymentForm();
			refetch();
		} catch (error) {
			console.error("Payment error:", error);
			toast({
				title: "Error",
				description: "Failed to record payment",
				variant: "destructive",
			});
		}
	};

	const resetPaymentForm = () => {
		setPaymentForm({
			amount: 0,
			payment_method: "",
			account_id: "",
			payment_number: "",
			notes: "",
		});
	};

	// Fetch income types
	const fetchIncomeTypes = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("income_types")
				.select("*")
				.eq("tenant_id", profile?.tenant_id)
				.order("type_name");

			if (error) throw error;
			setIncomeTypes(data || []);
		} catch (error) {
			console.error("Error fetching income types:", error);
		}
	}, [profile?.tenant_id]);

	// Fetch traveler services
	const fetchTravelerServices = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("additional_services")
				.select(`
					*,
					reservations (
						reservation_number,
						guest_name
					)
				`)
				.eq("tenant_id", profile?.tenant_id)
				.order("created_at", { ascending: false });

			if (error) throw error;
			setTravelerServices(data || []);
		} catch (error) {
			console.error("Error fetching traveler services:", error);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		if (profile?.tenant_id) {
			fetchIncomeTypes();
			fetchTravelerServices();
		}
	}, [profile?.tenant_id, fetchIncomeTypes, fetchTravelerServices]);

	// Handle service form submission
	const handleServiceSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const serviceData = {
				service_type: serviceForm.service_type,
				service_name: incomeTypes.find(t => t.id === serviceForm.service_type)?.type_name || "",
				reservation_id: serviceForm.reservation_id,
				quantity: serviceForm.quantity,
				unit_price: serviceForm.unit_price,
				total_amount: serviceForm.total_amount,
				service_date: serviceForm.service_date,
				notes: serviceForm.notes || null,
				tenant_id: profile?.tenant_id,
				created_by: profile?.id,
			};

			const { error } = await supabase
				.from("additional_services")
				.insert(serviceData);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Service added successfully",
			});

			setIsServiceDialogOpen(false);
			resetServiceForm();
			fetchTravelerServices();
			refetch();
		} catch (error) {
			console.error("Service error:", error);
			toast({
				title: "Error",
				description: "Failed to add service",
				variant: "destructive",
			});
		}
	};

	const resetServiceForm = () => {
		setServiceForm({
			service_type: "",
			reservation_id: "",
			quantity: 1,
			unit_price: 0,
			total_amount: 0,
			service_date: new Date().toISOString().split('T')[0],
			notes: "",
		});
	};

	// Update total amount when quantity or unit price changes
	useEffect(() => {
		setServiceForm(prev => ({
			...prev,
			total_amount: prev.quantity * prev.unit_price
		}));
	}, []);

	const getStatusBadge = (status: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

	const renderSignature = () => {
		if (!selectedReservation) return null;

		return (
			<div className="space-y-4">
				<div>
					<Label>Customer Signature</Label>
					<div className="border rounded-md">
						<SignatureCanvas
							ref={sigCanvas}
							canvasProps={{
								width: 400,
								height: 200,
								className: "signature-canvas",
							}}
						/>
					</div>
					<div className="flex gap-2 mt-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => sigCanvas.current?.clear()}
						>
							Clear
						</Button>
					</div>
				</div>
			</div>
		);
	};

	if (!hasAnyPermission(["access_income"])) {
		return (
			<div className="p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertDescription>
						You don't have permission to access income management.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (loading) {
		return <SectionLoader />;
	}

	return (
		<div className="p-6 space-y-6 pb-20">
			<div className="flex justify-between items-center">
				<Button onClick={() => navigate("/reservations/new")} className="">
					<Plus className="mr-2 size-4" />
					New Reservation
				</Button>
			</div>

			{/* Phone Verification Section */}
			<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<PhoneVerification 
					phone={profile?.phone}
					isVerified={profile?.is_phone_verified || false}
					onVerificationSuccess={() => {
						refetchProfile();
						toast({
							title: "Success",
							description: "Phone number verified successfully",
						});
					}}
				/>
			</div>

			<Tabs defaultValue="reservations" className="space-y-4">
				<TabsList>
					<TabsTrigger value="reservations">Reservations</TabsTrigger>
					<TabsTrigger value="payments">Payments</TabsTrigger>
					<TabsTrigger value="services">Traveler Services</TabsTrigger>
				</TabsList>

				<TabsContent value="reservations">
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
										<TableHead>Amount</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{reservations.map((reservation) => {
										const room = rooms.find(
											(r) => r.id === reservation.room_id,
										);
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
													LKR {reservation.total_amount.toLocaleString()}
												</TableCell>
												<TableCell>
													{getStatusBadge(reservation.status)}
												</TableCell>
												<TableCell className="space-x-2 flex">
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setSelectedReservation(reservation);
															setPaymentForm({
																...paymentForm,
																amount: reservation.balance_amount,
															});
															setIsPaymentDialogOpen(true);
														}}
													>
														<CreditCard className="size-4" />
													</Button>
													<Button
														variant="outline"
														size="sm"
														onClick={() => {
															setSelectedReservation(reservation);
															setIsPrintDialogOpen(true);
														}}
													>
														<Printer className="size-4" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="payments">
					<Card>
						<CardHeader>
							<CardTitle>Payment History</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Payment #</TableHead>
										<TableHead>Reservation</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Method</TableHead>
										<TableHead>Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{recentPayments.map((payment) => (
										<TableRow key={payment.id}>
											<TableCell className="font-medium">
												{payment.payment_number}
											</TableCell>
											<TableCell>
												{reservations.find(r => r.id === payment.reservation_id)?.reservation_number}
											</TableCell>
											<TableCell>
												LKR {payment.amount.toLocaleString()}
											</TableCell>
											<TableCell>{payment.payment_method}</TableCell>
											<TableCell>
												{new Date(payment.created_at).toLocaleDateString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="services">
					<Card>
						<CardHeader>
							<CardTitle className="flex justify-between items-center">
								Traveler Services
								<Button onClick={() => setIsServiceDialogOpen(true)}>
									<Plus className="mr-2 size-4" />
									Add Service
								</Button>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Service</TableHead>
										<TableHead>Reservation</TableHead>
										<TableHead>Guest</TableHead>
										<TableHead>Quantity</TableHead>
										<TableHead>Unit Price</TableHead>
										<TableHead>Total</TableHead>
										<TableHead>Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{travelerServices.map((service) => (
										<TableRow key={service.id}>
											<TableCell className="font-medium">
												{service.service_name}
											</TableCell>
											<TableCell>
												{service.reservations?.reservation_number}
											</TableCell>
											<TableCell>
												{service.reservations?.guest_name}
											</TableCell>
											<TableCell>{service.quantity}</TableCell>
											<TableCell>
												LKR {service.unit_price.toLocaleString()}
											</TableCell>
											<TableCell>
												LKR {service.total_amount.toLocaleString()}
											</TableCell>
											<TableCell>
												{new Date(service.service_date).toLocaleDateString()}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Payment Dialog */}
			<Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Record Payment</DialogTitle>
					</DialogHeader>
					<form onSubmit={handlePaymentSubmit} className="space-y-4">
						<div>
							<Label htmlFor="amount">Amount</Label>
							<Input
								id="amount"
								type="number"
								step="0.01"
								value={paymentForm.amount}
								onChange={(e) =>
									setPaymentForm({
										...paymentForm,
										amount: Number.parseFloat(e.target.value),
									})
								}
								required
							/>
						</div>

						<div>
							<Label htmlFor="payment_method">Payment Method</Label>
							<Select
								value={paymentForm.payment_method}
								onValueChange={(value) =>
									setPaymentForm({ ...paymentForm, payment_method: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select payment method" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="cash">Cash</SelectItem>
									<SelectItem value="card">Credit/Debit Card</SelectItem>
									<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
									<SelectItem value="online">Online Payment</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="account_id">Account</Label>
							<Select
								value={paymentForm.account_id}
								onValueChange={(value) =>
									setPaymentForm({ ...paymentForm, account_id: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select account" />
								</SelectTrigger>
								<SelectContent>
									{accounts.map((account) => (
										<SelectItem key={account.id} value={account.id}>
											{account.name} ({account.currency})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								value={paymentForm.notes}
								onChange={(e) =>
									setPaymentForm({ ...paymentForm, notes: e.target.value })
								}
								rows={3}
							/>
						</div>

						{renderSignature()}

						<div className="flex gap-2 justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsPaymentDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit">Record Payment</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Service Dialog */}
			<Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add Traveler Service</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleServiceSubmit} className="space-y-4">
						<div>
							<Label htmlFor="service_type">Service Type</Label>
							<Select
								value={serviceForm.service_type}
								onValueChange={(value) =>
									setServiceForm({ ...serviceForm, service_type: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select service type" />
								</SelectTrigger>
								<SelectContent>
									{incomeTypes.map((type) => (
										<SelectItem key={type.id} value={type.id}>
											{type.type_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label htmlFor="reservation_id">Reservation</Label>
							<Select
								value={serviceForm.reservation_id}
								onValueChange={(value) =>
									setServiceForm({ ...serviceForm, reservation_id: value })
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select reservation" />
								</SelectTrigger>
								<SelectContent>
									{reservations.map((reservation) => (
										<SelectItem key={reservation.id} value={reservation.id}>
											{reservation.reservation_number} - {reservation.guest_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="quantity">Quantity</Label>
								<Input
									id="quantity"
									type="number"
									min="1"
									value={serviceForm.quantity}
									onChange={(e) =>
										setServiceForm({
											...serviceForm,
											quantity: Number.parseInt(e.target.value),
										})
									}
									required
								/>
							</div>

							<div>
								<Label htmlFor="unit_price">Unit Price</Label>
								<Input
									id="unit_price"
									type="number"
									step="0.01"
									value={serviceForm.unit_price}
									onChange={(e) =>
										setServiceForm({
											...serviceForm,
											unit_price: Number.parseFloat(e.target.value),
										})
									}
									required
								/>
							</div>
						</div>

						<div>
							<Label htmlFor="total_amount">Total Amount</Label>
							<Input
								id="total_amount"
								type="number"
								step="0.01"
								value={serviceForm.total_amount}
								readOnly
								className="bg-gray-50"
							/>
						</div>

						<div>
							<Label htmlFor="service_date">Service Date</Label>
							<Input
								id="service_date"
								type="date"
								value={serviceForm.service_date}
								onChange={(e) =>
									setServiceForm({ ...serviceForm, service_date: e.target.value })
								}
								required
							/>
						</div>

						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								value={serviceForm.notes}
								onChange={(e) =>
									setServiceForm({ ...serviceForm, notes: e.target.value })
								}
								rows={3}
							/>
						</div>

						<div className="flex gap-2 justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsServiceDialogOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit">Add Service</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Print Dialog */}
			<Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Print Reservation Details</DialogTitle>
					</DialogHeader>
					{selectedReservation && (
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<strong>Reservation #:</strong> {selectedReservation.reservation_number}
								</div>
								<div>
									<strong>Guest:</strong> {selectedReservation.guest_name}
								</div>
								<div>
									<strong>Check-in:</strong>{" "}
									{new Date(selectedReservation.check_in_date).toLocaleDateString()}
								</div>
								<div>
									<strong>Check-out:</strong>{" "}
									{new Date(selectedReservation.check_out_date).toLocaleDateString()}
								</div>
								<div>
									<strong>Total Amount:</strong> LKR {selectedReservation.total_amount.toLocaleString()}
								</div>
								<div>
									<strong>Paid Amount:</strong> LKR {selectedReservation.paid_amount.toLocaleString()}
								</div>
								<div>
									<strong>Balance:</strong> LKR {selectedReservation.balance_amount.toLocaleString()}
								</div>
							</div>
							<div className="flex gap-2 justify-end">
								<Button
									variant="outline"
									onClick={() => setIsPrintDialogOpen(false)}
								>
									Close
								</Button>
								<Button onClick={() => window.print()}>
									<Printer className="mr-2 size-4" />
									Print
								</Button>
							</div>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Income;