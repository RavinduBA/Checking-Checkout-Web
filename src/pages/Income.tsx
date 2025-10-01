import { AlertCircle, DollarSign } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const Income = () => {
	const { toast } = useToast();
	const { hasAnyPermission } = usePermissions();
	const { profile } = useProfile();
	const { reservations, rooms, accounts, loading, refetch } = useIncomeData();

	const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
	const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);
	const [incomeForm, setIncomeForm] = useState({
		amount: 0,
		description: "",
		account_id: "",
		notes: "",
	});

	const fetchIncomeHistory = useCallback(async () => {
		try {
			const { data, error } = await supabase
				.from("income")
				.select("*, accounts(name)")
				.eq("tenant_id", profile?.tenant_id)
				.order("created_at", { ascending: false })
				.limit(20);
			if (error) throw error;
			setIncomeHistory(data || []);
		} catch (error) {
			console.error("Error fetching income history:", error);
		}
	}, [profile?.tenant_id]);

	useEffect(() => {
		if (profile?.tenant_id) {
			fetchIncomeHistory();
		}
	}, [profile?.tenant_id, fetchIncomeHistory]);

	const handleIncomeSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedReservation) return;

		try {
			const incomeData = {
				description: incomeForm.description || `Income for reservation ${selectedReservation.reservation_number}`,
				amount: incomeForm.amount,
				account_id: incomeForm.account_id,
				type: "booking" as const,
				payment_method: "cash",
				location_id: selectedReservation.location_id,
				tenant_id: profile?.tenant_id,
				created_by: profile?.id,
			};

			const { error } = await supabase.from("income").insert(incomeData);
			if (error) throw error;

			toast({ title: "Success", description: "Income recorded successfully" });
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
		setIncomeForm({ amount: 0, description: "", account_id: "", notes: "" });
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
													description: `Income for reservation ${reservation.reservation_number}`,
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
								<TableHead>Description</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Account</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{incomeHistory.map((income) => (
								<TableRow key={income.id}>
									<TableCell>{new Date(income.created_at).toLocaleDateString()}</TableCell>
									<TableCell>{income.description}</TableCell>
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
							<Label htmlFor="description">Description</Label>
							<Input id="description" value={incomeForm.description}
								onChange={(e) => setIncomeForm({ ...incomeForm, description: e.target.value })}
								placeholder="Description of income" required />
						</div>

						<div>
							<Label htmlFor="account_id">Account</Label>
							<Select value={incomeForm.account_id} onValueChange={(value) => setIncomeForm({ ...incomeForm, account_id: value })}>
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
							<Textarea id="notes" value={incomeForm.notes} rows={3}
								onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
								placeholder="Additional notes..." />
						</div>

						<div className="flex gap-2 justify-end">
							<Button type="button" variant="outline" onClick={() => {
								setIsIncomeDialogOpen(false);
								resetIncomeForm();
							}}>Cancel</Button>
							<Button type="submit">Record Income</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default Income;