import { ReservationsListSkeleton } from "@/components/ReservationsListSkeleton";
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
		</div>
	);
}
