import { useState } from "react";
import { Plus } from "lucide-react";
import { AddIncomeDialog } from "./AddIncomeDialog";
import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLocationContext } from "@/context/LocationContext";
import { useIncomeData } from "@/hooks/useReservationsData";
import { useIncomeData as useAccountsData } from "@/hooks/useIncomeData";

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
	const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
	const { selectedLocation } = useLocationContext();
	const { incomeRecords, loading, refetch } = useIncomeData();
	const { accounts } = useAccountsData();

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

	const formatCurrency = (amount: number, currency: string) => {
		return `${getCurrencySymbol(currency)} ${amount.toLocaleString()}`;
	};

	const handleAddIncome = () => {
		setIsIncomeDialogOpen(true);
	};

	const handleIncomeSuccess = () => {
		refetch();
		setIsIncomeDialogOpen(false);
	};

	const handleCloseDialog = () => {
		setIsIncomeDialogOpen(false);
	};

	if (loading) {
		return <ReservationsListSkeleton />;
	}

	return (
		<div className="space-y-4">
			<div className="bg-white shadow rounded-lg">
				<div className="px-4 py-5 sm:p-6">
					<div className="flex justify-between items-center mb-4">
						<h3 className="text-lg leading-6 font-medium text-gray-900">
							Payments
						</h3>
						<Button
							onClick={handleAddIncome}
							size="sm"
							className="flex items-center gap-2"
						>
							<Plus className="h-4 w-4" />
							Add Income
						</Button>
					</div>
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
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</div>
			</div>

			<AddIncomeDialog
				isOpen={isIncomeDialogOpen}
				onClose={handleCloseDialog}
				selectedReservation={null}
				accounts={accounts}
				onSuccess={handleIncomeSuccess}
			/>
		</div>
	);
}
