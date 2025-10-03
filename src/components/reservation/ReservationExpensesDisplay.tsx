import { useIncomeData } from "@/hooks/useReservationsData";

interface ReservationExpensesDisplayProps {
	reservationId: string;
	currency: string;
	isCompact?: boolean;
}

export function ReservationExpensesDisplay({
	reservationId,
	currency,
	isCompact = false,
}: ReservationExpensesDisplayProps) {
	const { incomeRecords } = useIncomeData();

	// Utility function
	const getCurrencySymbol = (currency: string): string => {
		const symbols: Record<string, string> = {
			LKR: "Rs.",
			USD: "$",
			EUR: "€",
			GBP: "£",
		};
		return symbols[currency] || currency;
	};
	const pendingExpenses = incomeRecords
		.filter(
			(inc) =>
				inc.booking_id === reservationId && inc.payment_method === "pending",
		)
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	const totalExpenses = incomeRecords
		.filter((inc) => inc.booking_id === reservationId)
		.reduce((sum, inc) => sum + Number(inc.amount), 0);

	if (totalExpenses === 0) {
		return <span className="text-muted-foreground">-</span>;
	}

	if (isCompact) {
		return (
			<span>
				Expenses: {getCurrencySymbol(currency)} {totalExpenses.toLocaleString()}
				{pendingExpenses > 0 && (
					<span className="text-yellow-600 ml-2">
						(Pending: {getCurrencySymbol(currency)}{" "}
						{pendingExpenses.toLocaleString()})
					</span>
				)}
			</span>
		);
	}

	return (
		<div className="text-sm">
			<div className="space-y-1">
				<div className="font-medium">
					{getCurrencySymbol(currency)} {totalExpenses.toLocaleString()}
				</div>
				{pendingExpenses > 0 && (
					<div className="text-yellow-600 text-xs">
						Pending: {getCurrencySymbol(currency)}{" "}
						{pendingExpenses.toLocaleString()}
					</div>
				)}
			</div>
		</div>
	);
}
