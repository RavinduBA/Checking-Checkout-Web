import { AlertCircle, DollarSign } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { useProfile } from "@/hooks/useProfile";
import { useIncomeData } from "@/hooks/useIncomeData";
import { supabase } from "@/integrations/supabase/client";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];
type Income = Database["public"]["Tables"]["income"]["Row"];
type IncomeType = {
	id: string;
	type_name: string;
	created_at: string;
	tenant_id: string;
};

const Income = () => {
	const { toast } = useToast();
	const { hasAnyPermission } = usePermissions();
	const { profile } = useProfile();
	const { reservations, rooms, accounts, loading, refetch } = useIncomeData();

	const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
	const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);
	const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
	const [incomeForm, setIncomeForm] = useState({
		amount: 0,
		note: "",
		account_id: "",
		income_type_id: "",
		payment_type: "direct" as "direct" | "deferred", // direct = paid now, deferred = add to bill
	});

	const fetchIncomeHistory = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("income")
				.select("*, accounts(name), income_types(type_name)")
				.eq("tenant_id", profile?.tenant_id)
				.order("created_at", { ascending: false })
				.limit(20);
			if (error) throw error;
			setIncomeHistory(data || []);
		} catch (error) {
			console.error("Error fetching income history:", error);
		}
	}, [profile?.tenant_id]);

	const fetchIncomeTypes = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("income_types")
				.select("*")
				.eq("tenant_id", profile?.tenant_id)
				.order("type_name", { ascending: true });
			if (error) throw error;
			setIncomeTypes(data || []);
		} catch (error) {
			console.error("Error fetching income types:", error);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		if (profile?.tenant_id) {
			fetchIncomeHistory();
			fetchIncomeTypes();
		}
	}, [profile?.tenant_id, fetchIncomeHistory, fetchIncomeTypes]);

	const handleIncomeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedReservation) return;

		try {
			const incomeData = {
				note: incomeForm.note || `Income for reservation ${selectedReservation.reservation_number}`,
				amount: incomeForm.amount,
				// For direct payments: require account_id, for deferred: set to null
				account_id: incomeForm.payment_type === "direct" ? incomeForm.account_id : null,
				income_type_id: incomeForm.income_type_id || null,
				type: "booking" as const,
				payment_method: incomeForm.payment_type === "direct" ? "cash" : "pending",
				location_id: selectedReservation.location_id,
				tenant_id: profile?.tenant_id,
				// booking_id now references reservations table (renamed foreign key constraint)
				booking_id: selectedReservation.id,
			};

			// Start transaction-like operations
			const { error: incomeError } = await supabase.from("income").insert(incomeData);
			if (incomeError) throw incomeError;

			// If deferred payment, update reservation total amount
			if (incomeForm.payment_type === "deferred") {
				const newTotal = selectedReservation.total_amount + incomeForm.amount;
				const { error: reservationError } = await supabase
					.from("reservations")
					.update({ 
						total_amount: newTotal,
						updated_at: new Date().toISOString()
					})
					.eq("id", selectedReservation.id);
				if (reservationError) throw reservationError;
			}

			const successMessage = incomeForm.payment_type === "direct" 
				? "Direct payment recorded to account" 
				: "Amount added to reservation bill";
			
			toast({ title: "Success", description: successMessage });
			setIsIncomeDialogOpen(false);
			resetIncomeForm();
			fetchIncomeHistory();
			refetch();
		} catch (error) {
			console.error("Income error:", error);
			toast({ title: "Error", description: "Failed to record income", variant: "destructive" });
		}
	};

	const resetIncomeForm = () => {
		setIncomeForm({ amount: 0, note: "", account_id: "", income_type_id: "", payment_type: "direct" });
		setSelectedReservation(null);
	};

	const getStatusBadge = (status: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
			tentative: "outline", confirmed: "default", checked_in: "secondary", 
			checked_out: "destructive", cancelled: "destructive",
		};
		return <Badge variant={variants[status] || "default"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
	};

	if (!hasAnyPermission(["access_income"])) {
		return (
			<div className="p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertDescription>You don't have permission to access income management.</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (loading) return <SectionLoader />;

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-2xl font-bold">Income Management</h1>

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
										<TableCell className="font-medium">{reservation.reservation_number}</TableCell>
										<TableCell>{reservation.guest_name}</TableCell>
										<TableCell>{room?.room_number} - {room?.room_type}</TableCell>
										<TableCell>{new Date(reservation.check_in_date).toLocaleDateString()}</TableCell>
										<TableCell>{new Date(reservation.check_out_date).toLocaleDateString()}</TableCell>
										<TableCell>LKR {reservation.total_amount.toLocaleString()}</TableCell>
										<TableCell>{getStatusBadge(reservation.status)}</TableCell>
										<TableCell>
											<Button variant="outline" size="sm" onClick={() => {
												setSelectedReservation(reservation);
												setIncomeForm({
													...incomeForm,
													amount: reservation.total_amount,
													note: `Income for reservation ${reservation.reservation_number}`,
												});
												setIsIncomeDialogOpen(true);
											}}>
												<DollarSign className="size-4 mr-1" />Add Income
											</Button>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Recent Income History</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Note</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Account</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{incomeHistory.map((income) => (
								<TableRow key={income.id}>
									<TableCell>{new Date(income.created_at).toLocaleDateString()}</TableCell>
									<TableCell>{income.note}</TableCell>
									<TableCell>{income.income_types?.type_name || '-'}</TableCell>
									<TableCell>LKR {income.amount.toLocaleString()}</TableCell>
									<TableCell>{income.accounts?.name || '-'}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

		<Dialog open={isIncomeDialogOpen} onOpenChange={setIsIncomeDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Income</DialogTitle>
					<DialogDescription>
						Record income for the selected reservation.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleIncomeSubmit} className="space-y-4">
					{selectedReservation && (
						<div className="p-4 bg-gray-50 rounded-md">
							<p><strong>Reservation:</strong> {selectedReservation.reservation_number}</p>
							<p><strong>Guest:</strong> {selectedReservation.guest_name}</p>
							<p><strong>Amount:</strong> LKR {selectedReservation.total_amount.toLocaleString()}</p>
						</div>
					)}

					<div>
						<Label htmlFor="amount">Amount</Label>
						<Input id="amount" type="number" step="0.01" value={incomeForm.amount}
							onChange={(e) => setIncomeForm({ ...incomeForm, amount: Number.parseFloat(e.target.value) })} required />
					</div>

					<div>
						<Label htmlFor="note">Note</Label>
						<Input id="note" value={incomeForm.note}
							onChange={(e) => setIncomeForm({ ...incomeForm, note: e.target.value })}
							placeholder="Note about this income" required />
					</div>

					<div>
						<Label htmlFor="income_type_id">Income Type</Label>
						<Select value={incomeForm.income_type_id} onValueChange={(value) => setIncomeForm({ ...incomeForm, income_type_id: value })}>
							<SelectTrigger>
								<SelectValue placeholder="Select income type" />
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
						<Label htmlFor="payment_type">Payment Type</Label>
						<Select value={incomeForm.payment_type} onValueChange={(value: "direct" | "deferred") => setIncomeForm({ ...incomeForm, payment_type: value })}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="direct">💵 Direct Payment (Paid Now)</SelectItem>
								<SelectItem value="deferred">📋 Add to Bill (Pay Later)</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-sm text-gray-600 mt-1">
							{incomeForm.payment_type === "direct" 
								? "Guest paid directly. Will update account balance." 
								: "Add to reservation bill. Guest will pay during checkout."}
						</p>
					</div>

					{incomeForm.payment_type === "direct" && (
						<div>
							<Label htmlFor="account_id">Account *</Label>
							<Select value={incomeForm.account_id} onValueChange={(value) => setIncomeForm({ ...incomeForm, account_id: value })} required>
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
							<p className="text-sm text-gray-600 mt-1">Account to record the payment</p>
						</div>
					)}

					{incomeForm.payment_type === "deferred" && (
						<div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
							<p className="text-sm text-blue-800">
								<strong>💡 Deferred Payment:</strong> This amount will be added to the reservation total.
								Guest will pay during checkout. No account will be updated now.
							</p>
						</div>
					)}						<div className="flex gap-2 justify-end">
							<Button type="button" variant="outline" onClick={() => {
								setIsIncomeDialogOpen(false);
								resetIncomeForm();
							}}>Cancel</Button>
							<Button type="submit" disabled={!incomeForm.amount || !selectedReservation || (incomeForm.payment_type === "direct" && !incomeForm.account_id)}>Record Income</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Income;