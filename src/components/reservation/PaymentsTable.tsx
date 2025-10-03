import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { useLocationContext } from "@/context/LocationContext";
import { useIncomeData } from "@/hooks/useReservationsData";
import { supabase } from "@/integrations/supabase/client";

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

interface PaymentsTableProps {
	// No props needed - component fetches its own data
}

export function PaymentsTable() {
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const { user } = useAuth();
	const { selectedLocation } = useLocationContext();
	const { incomeRecords, loading, refetch } = useIncomeData();

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

	const handleDeletePayment = async (id: string) => {
		if (!user || !selectedLocation) {
			toast.error("Missing user or location information");
			return;
		}

		try {
			const { error } = await supabase
				.from("income")
				.delete()
				.eq("id", id)
				.eq("location_id", selectedLocation);

			if (error) throw error;

			toast.success("Payment deleted successfully");
			refetch();
		} catch (error) {
			console.error("Error deleting payment:", error);
			toast.error("Failed to delete payment");
		} finally {
			setDeleteId(null);
		}
	};

	const formatCurrency = (amount: number, currency: string) => {
		return `${getCurrencySymbol(currency)} ${amount.toLocaleString()}`;
	};

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="space-y-4">
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
						Payments
					</h3>
					{incomeRecords.length === 0 ? (
						<p className="text-sm text-muted-foreground">No payments found</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Payment Method</TableHead>
										<TableHead>Account</TableHead>
										<TableHead>Reference</TableHead>
										<TableHead>Notes</TableHead>
										<TableHead className="w-[50px]">Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{incomeRecords.map((payment) => (
										<TableRow key={payment.id}>
											<TableCell>
												{new Date(payment.date).toLocaleDateString()}
											</TableCell>
											<TableCell className="font-medium">
												{formatCurrency(payment.amount, payment.currency)}
											</TableCell>
											<TableCell>
												<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
													{payment.payment_method}
												</span>
											</TableCell>
											<TableCell>-</TableCell>
											<TableCell>-</TableCell>
											<TableCell>
												{payment.note ? (
													<span className="text-sm text-muted-foreground truncate max-w-[150px] block">
														{payment.note}
													</span>
												) : (
													"-"
												)}
											</TableCell>
											<TableCell>
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => setDeleteId(payment.id)}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Delete Payment
															</AlertDialogTitle>
															<AlertDialogDescription>
																Are you sure you want to delete this payment?
																This action cannot be undone.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel
																onClick={() => setDeleteId(null)}
															>
																Cancel
															</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	deleteId && handleDeletePayment(deleteId)
																}
																className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
															>
																Delete
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
