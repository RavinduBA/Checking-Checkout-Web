import { format } from "date-fns";
import { CreditCard, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CurrencySelector } from "@/components/CurrencySelector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { convertCurrency } from "@/utils/currency";

type Reservation = Tables<"reservations"> & {
	locations: Tables<"locations">;
	rooms: Tables<"rooms">;
};
type Account = Tables<"accounts">;

interface PaymentDialogProps {
	isOpen: boolean;
	onClose: () => void;
	reservationId: string;
	initialAmount: number;
	initialCurrency: string;
	onSuccess: () => void;
}

export function PaymentDialog({
	isOpen,
	onClose,
	reservationId,
	initialAmount,
	initialCurrency,
	onSuccess,
}: PaymentDialogProps) {
	const { toast } = useToast();
	const { user } = useAuth();
	const { tenant } = useTenant();
	const { selectedLocation } = useLocationContext();

	const [reservation, setReservation] = useState<Reservation | null>(null);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [location, setLocation] = useState<any>(null);
	const [incomeRecords, setIncomeRecords] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const [formData, setFormData] = useState({
		payment_type: "room_payment",
		payment_method: "",
		amount: initialAmount,
		account_id: "",
		notes: "",
		currency: initialCurrency as any,
		reference_number: "",
	});

	const fetchLocation = useCallback(
		async (locationId: string) => {
			if (!tenant?.id) return;

			try {
				const { data } = await supabase
					.from("locations")
					.select("id, name, phone, email")
					.eq("id", locationId)
					.eq("tenant_id", tenant.id)
					.single();

				setLocation(data);
			} catch (error) {
				console.error("Failed to fetch location:", error);
			}
		},
		[tenant?.id],
	);

	const fetchReservationAndAccounts = useCallback(async () => {
		if (!tenant?.id || !reservationId) {
			return;
		}

		setLoading(true);
		try {
			const [reservationRes, accountsRes, incomeRes] = await Promise.all([
				supabase
					.from("reservations")
					.select(`
            *,
            locations (*),
            rooms (*)
          `)
					.eq("id", reservationId)
					.eq("tenant_id", tenant.id)
					.single(),

				supabase
					.from("accounts")
					.select("*")
					.eq("tenant_id", tenant.id)
					.order("name"),

				supabase
					.from("income")
					.select("*")
					.eq("booking_id", reservationId)
					.eq("tenant_id", tenant.id)
					.order("created_at", { ascending: false }),
			]);

			if (reservationRes.error) {
				toast({
					title: "Error",
					description: "Failed to fetch reservation details",
					variant: "destructive",
				});
				return;
			}

			setReservation(reservationRes.data);
			setAccounts(accountsRes.data || []);
			setIncomeRecords(incomeRes.data || []);

			if (reservationRes.data?.location_id) {
				await fetchLocation(reservationRes.data.location_id);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to load payment form",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [tenant?.id, reservationId, toast, fetchLocation]);

	useEffect(() => {
		if (isOpen && reservationId) {
			fetchReservationAndAccounts();
		}
	}, [isOpen, reservationId, fetchReservationAndAccounts]);

	useEffect(() => {
		setFormData(prev => ({
			...prev,
			amount: initialAmount,
			currency: initialCurrency as any,
		}));
	}, [initialAmount, initialCurrency]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!reservation || !tenant?.id) return;

		setSubmitting(true);
		try {
			// Convert amount to the account currency if needed
			const selectedAccount = accounts.find(acc => acc.id === formData.account_id);
			const accountCurrency = selectedAccount?.currency || "LKR";
			const convertedAmount = await convertCurrency(
				formData.amount,
				formData.currency,
				accountCurrency,
			);

			// Create payment record (database trigger will automatically update reservation)
			const { error: paymentError } = await supabase.from("payments").insert({
				reservation_id: reservation.id,
				amount: convertedAmount,
				currency: accountCurrency as "LKR" | "USD" | "EUR" | "GBP",
				payment_method: formData.payment_method,
				payment_type: formData.payment_type,
				payment_number: `PAY-${Date.now()}`, // Generate unique payment number
				account_id: formData.account_id,
				notes: formData.notes,
				reference_number: formData.reference_number || null,
				created_by: user?.id || null,
				// Add tenant_id for security (will be required soon)
				tenant_id: tenant.id,
			});

			if (paymentError) throw paymentError;

			// No need to manually update reservation - database trigger handles this automatically

			toast({
				title: "Payment Recorded",
				description: `Payment of ${formData.currency} ${formData.amount} has been recorded successfully.`,
			});

			onSuccess();
			onClose();
		} catch (error) {
			console.error("Payment error:", error);
			toast({
				title: "Payment Error",
				description: "Failed to record payment. Please try again.",
				variant: "destructive",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			payment_type: "room_payment",
			payment_method: "",
			amount: initialAmount,
			account_id: "",
			notes: "",
			currency: initialCurrency as any,
			reference_number: "",
		});
	};

	const handleClose = () => {
		onClose();
		resetForm();
	};

	if (loading) {
		return (
			<Dialog open={isOpen} onOpenChange={handleClose}>
				<DialogContent className="max-w-2xl">
					<div className="flex justify-center items-center py-8">
						<SectionLoader />
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CreditCard className="size-5" />
						Record Payment
					</DialogTitle>
					<DialogDescription>
						Record a payment for reservation {reservation?.reservation_number}
					</DialogDescription>
				</DialogHeader>

				{reservation && (
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Reservation Details */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Reservation Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="grid grid-cols-2 gap-4 text-sm">
									<div>
										<span className="font-medium">Guest:</span> {reservation.guest_name}
									</div>
									<div>
										<span className="font-medium">Room:</span> {reservation.rooms?.room_number}
									</div>
									<div>
										<span className="font-medium">Check-in:</span>{" "}
										{format(new Date(reservation.check_in_date), "MMM dd, yyyy")}
									</div>
									<div>
										<span className="font-medium">Check-out:</span>{" "}
										{format(new Date(reservation.check_out_date), "MMM dd, yyyy")}
									</div>
									<div>
										<span className="font-medium">Total Amount:</span>{" "}
										{reservation.currency} {reservation.total_amount.toLocaleString()}
									</div>
									<div>
										<span className="font-medium">Paid Amount:</span>{" "}
										{reservation.currency} {(reservation.paid_amount || 0).toLocaleString()}
									</div>
									<div className="col-span-2">
										<span className="font-medium">Balance Amount:</span>{" "}
										<span className="text-red-600 font-semibold">
											{reservation.currency} {(reservation.balance_amount || 0).toLocaleString()}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Payment Form */}
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Payment Information</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<Label htmlFor="payment_type">Payment Type</Label>
									<Select
										value={formData.payment_type}
										onValueChange={(value) =>
											setFormData({ ...formData, payment_type: value })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="room_payment">Room Payment</SelectItem>
											<SelectItem value="advance_payment">Advance Payment</SelectItem>
											<SelectItem value="partial_payment">Partial Payment</SelectItem>
											<SelectItem value="full_payment">Full Payment</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="payment_method">Payment Method</Label>
									<Select
										value={formData.payment_method}
										onValueChange={(value) =>
											setFormData({ ...formData, payment_method: value })
										}
										required
									>
										<SelectTrigger>
											<SelectValue placeholder="Select payment method" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="cash">Cash</SelectItem>
											<SelectItem value="card">Credit/Debit Card</SelectItem>
											<SelectItem value="bank_transfer">Bank Transfer</SelectItem>
											<SelectItem value="mobile_payment">Mobile Payment</SelectItem>
											<SelectItem value="cheque">Cheque</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div>
									<Label htmlFor="amount">Amount</Label>
									<Input
										id="amount"
										type="number"
										step="0.01"
										value={formData.amount}
										onChange={(e) =>
											setFormData({
												...formData,
												amount: parseFloat(e.target.value) || 0,
											})
										}
										required
									/>
								</div>

								<div>
									<Label htmlFor="currency">Currency</Label>
									<CurrencySelector
										currency={formData.currency}
										onCurrencyChange={(currency) =>
											setFormData({ ...formData, currency })
										}
										label=""
										showGoogleSearchLink={true}
									/>
								</div>

								<div>
									<Label htmlFor="account_id">Account</Label>
									<Select
										value={formData.account_id}
										onValueChange={(value) =>
											setFormData({ ...formData, account_id: value })
										}
										required
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
									<Label htmlFor="reference_number">Reference Number (Optional)</Label>
									<Input
										id="reference_number"
										value={formData.reference_number}
										onChange={(e) =>
											setFormData({ ...formData, reference_number: e.target.value })
										}
										placeholder="Transaction ID, Cheque number, etc."
									/>
								</div>

								<div>
									<Label htmlFor="notes">Notes (Optional)</Label>
									<Textarea
										id="notes"
										value={formData.notes}
										onChange={(e) =>
											setFormData({ ...formData, notes: e.target.value })
										}
										placeholder="Any additional notes about this payment"
										rows={3}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Submit Buttons */}
						<div className="flex gap-3 justify-end">
							<Button type="button" variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={submitting || !formData.payment_method || !formData.account_id}
							>
								<Save className="size-4 mr-2" />
								{submitting ? "Recording..." : "Record Payment"}
							</Button>
						</div>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}