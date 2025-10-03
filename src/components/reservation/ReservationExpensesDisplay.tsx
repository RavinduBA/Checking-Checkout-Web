interface ReservationExpensesDisplayProps {
	reservationId: string;
	currency: string;
	incomeRecords: Array<{
		id: string;
		booking_id: string | null;
		amount: number;
		payment_method: string;
		currency: string;
	}>;
	getCurrencySymbol: (currency: string) => string;
	isCompact?: boolean;
}

export function ReservationExpensesDisplay({
	reservationId,
	currency,
	incomeRecords,
	getCurrencySymbol,
	isCompact = false,
}: ReservationExpensesDisplayProps) {
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
		return (
			<span className="text-muted-foreground">
				-
			</span>
		);
	}

	if (isCompact) {
		return (
			<span>
				Expenses: {getCurrencySymbol(currency)} {totalExpenses.toLocaleString()}
				{pendingExpenses > 0 && (
					<span className="text-yellow-600 ml-2">
						(Pending: {getCurrencySymbol(currency)} {pendingExpenses.toLocaleString()})
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
						Pending: {getCurrencySymbol(currency)} {pendingExpenses.toLocaleString()}
					</div>
				)}
			</div>
		</div>
	);
}