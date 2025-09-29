import {
	ArrowDownLeft,
	ArrowUpRight,
	Building2,
	Calendar,
	ChevronDown,
	ChevronRight,
	CreditCard,
	DollarSign,
	Download,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { convertCurrency, formatCurrency } from "@/utils/currency";

type AccountBalance = {
	id: string;
	name: string;
	currency: string;
	initial_balance: number;
	current_balance: number;
	total_expenses: number;
	total_payments: number;
	transaction_count: number;
	transactions: TransactionDetail[];
};

type TransactionDetail = {
	id: string;
	date: string;
	type: "expense" | "payment" | "transfer_in" | "transfer_out";
	description: string;
	amount: number;
	running_balance: number;
	currency: string;
	note?: string;
};

type FinancialSummary = {
	totalExpenses: number;
	totalPayments: number;
	netProfit: number;
	profitMargin: number;
	totalTransactions: number;
};

export default function ComprehensiveReports() {
	const [loading, setLoading] = useState(true);
	const [accounts, setAccounts] = useState<AccountBalance[]>([]);
	const [summary, setSummary] = useState<FinancialSummary>({
		totalExpenses: 0,
		totalPayments: 0,
		netProfit: 0,
		profitMargin: 0,
		totalTransactions: 0,
	});
	const [locations, setLocations] = useState<any[]>([]);
	const [selectedLocation, setSelectedLocation] = useState("all");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [baseCurrency, setBaseCurrency] = useState<"LKR" | "USD">("LKR");
	const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
		new Set(),
	);
	const { toast } = useToast();

	useEffect(() => {
		fetchLocations();
		fetchComprehensiveData();
	}, []);

	useEffect(() => {
		fetchComprehensiveData();
	}, [selectedLocation, dateFrom, dateTo, baseCurrency]);

	const fetchLocations = async () => {
		try {
			const { data, error } = await supabase
				.from("locations")
				.select("*")
				.eq("is_active", true);

			if (error) throw error;
			setLocations(data || []);
		} catch (error) {
			console.error("Error fetching locations:", error);
		}
	};

	const fetchComprehensiveData = async () => {
		setLoading(true);
		try {
			// Fetch all accounts
			const { data: accountsData, error: accountsError } = await supabase
				.from("accounts")
				.select("*")
				.order("name");

			if (accountsError) throw accountsError;

			const accountBalances: AccountBalance[] = [];
			const globalSummary = {
				totalExpenses: 0,
				totalPayments: 0,
				netProfit: 0,
				profitMargin: 0,
				totalTransactions: 0,
			};

			for (const account of accountsData || []) {
				const balance = await calculateAccountBalance(account);
				accountBalances.push(balance);

				const convertedExpenses = await convertCurrency(
					balance.total_expenses,
					account.currency as any,
					baseCurrency,
				);
				const convertedPayments = await convertCurrency(
					balance.total_payments,
					account.currency as any,
					baseCurrency,
				);

				globalSummary.totalExpenses += convertedExpenses;
				globalSummary.totalPayments += convertedPayments;
				globalSummary.totalTransactions += balance.transaction_count;
			}

			globalSummary.netProfit =
				globalSummary.totalPayments - globalSummary.totalExpenses;
			globalSummary.profitMargin =
				globalSummary.totalPayments > 0
					? (globalSummary.netProfit / globalSummary.totalPayments) * 100
					: 0;

			setAccounts(accountBalances);
			setSummary(globalSummary);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to fetch comprehensive data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	const calculateAccountBalance = async (
		account: any,
	): Promise<AccountBalance> => {
		try {
			let expenseQuery = supabase
				.from("expenses")
				.select("id, date, amount, main_type, sub_type, note, currency")
				.eq("account_id", account.id);

			let paymentsQuery = supabase
				.from("payments")
				.select(
					"id, created_at, amount, payment_type, notes, currency, reservations(guest_name, reservation_number)",
				)
				.eq("account_id", account.id);

			let transfersFromQuery = supabase
				.from("account_transfers")
				.select("id, created_at, amount, note")
				.eq("from_account_id", account.id);

			let transfersToQuery = supabase
				.from("account_transfers")
				.select("id, created_at, amount, conversion_rate, note")
				.eq("to_account_id", account.id);

			// Apply location filters (only for income and expenses that have location_id)
			if (selectedLocation !== "all") {
				expenseQuery = expenseQuery.eq("location_id", selectedLocation);
				// For payments, we filter by reservation location using inner join
				paymentsQuery = supabase
					.from("payments")
					.select(
						"id, created_at, amount, payment_type, notes, currency, reservations!inner(guest_name, reservation_number, location_id)",
					)
					.eq("account_id", account.id)
					.eq("reservations.location_id", selectedLocation);
			}

			// Apply date filters
			if (dateFrom) {
				expenseQuery = expenseQuery.gte("date", dateFrom);
				paymentsQuery = paymentsQuery.gte("created_at", dateFrom);
				transfersFromQuery = transfersFromQuery.gte("created_at", dateFrom);
				transfersToQuery = transfersToQuery.gte("created_at", dateFrom);
			}
			if (dateTo) {
				expenseQuery = expenseQuery.lte("date", dateTo);
				paymentsQuery = paymentsQuery.lte("created_at", dateTo);
				transfersFromQuery = transfersFromQuery.lte("created_at", dateTo);
				transfersToQuery = transfersToQuery.lte("created_at", dateTo);
			}

			// Execute all queries
			const [
				expenseResult,
				paymentsResult,
				transfersFromResult,
				transfersToResult,
			] = await Promise.all([
				expenseQuery.order("date", { ascending: true }),
				paymentsQuery.order("created_at", { ascending: true }),
				transfersFromQuery.order("created_at", { ascending: true }),
				transfersToQuery.order("created_at", { ascending: true }),
			]);

			// Combine all transactions and calculate running balance
			const transactions: TransactionDetail[] = [];
			let runningBalance = account.initial_balance;
			let totalExpenses = 0;
			let totalPayments = 0;

			// Combine all transactions with dates
			const allTransactions: Array<{
				id: string;
				date: string;
				type: TransactionDetail["type"];
				amount: number;
				description: string;
				currency: string;
				note?: string;
			}> = [];

			// Add expense transactions
			for (const expense of expenseResult.data || []) {
				allTransactions.push({
					id: expense.id,
					date: expense.date,
					type: "expense",
					amount: parseFloat(expense.amount.toString()),
					description: `${expense.main_type} - ${expense.sub_type}`,
					currency: expense.currency,
					note: expense.note,
				});
				totalExpenses += parseFloat(expense.amount.toString());
			}

			// Add payment transactions
			for (const payment of paymentsResult.data || []) {
				allTransactions.push({
					id: payment.id,
					date: payment.created_at,
					type: "payment",
					amount: parseFloat(payment.amount.toString()),
					description: `${payment.payment_type} - ${(payment as any).reservations?.guest_name || "Unknown"} (${(payment as any).reservations?.reservation_number || "N/A"})`,
					currency: payment.currency,
					note: payment.notes,
				});
				totalPayments += parseFloat(payment.amount.toString());
			}

			// Add transfer transactions
			for (const transfer of transfersFromResult.data || []) {
				allTransactions.push({
					id: transfer.id,
					date: transfer.created_at,
					type: "transfer_out",
					amount: parseFloat(transfer.amount.toString()),
					description: `Transfer Out${transfer.note ? ` - ${transfer.note}` : ""}`,
					currency: account.currency,
					note: transfer.note,
				});
			}

			for (const transfer of transfersToResult.data || []) {
				const amount =
					parseFloat(transfer.amount.toString()) *
					parseFloat(transfer.conversion_rate.toString());
				allTransactions.push({
					id: transfer.id,
					date: transfer.created_at,
					type: "transfer_in",
					amount: amount,
					description: `Transfer In${transfer.note ? ` - ${transfer.note}` : ""}`,
					currency: account.currency,
					note: transfer.note,
				});
			}

			// Sort by date and calculate running balances
			allTransactions.sort(
				(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
			);

			for (const txn of allTransactions) {
				if (txn.type === "payment" || txn.type === "transfer_in") {
					runningBalance += txn.amount;
				} else {
					runningBalance -= txn.amount;
				}

				transactions.push({
					...txn,
					running_balance: runningBalance,
				});
			}

			return {
				id: account.id,
				name: account.name,
				currency: account.currency,
				initial_balance: account.initial_balance,
				current_balance: runningBalance,
				total_expenses: totalExpenses,
				total_payments: totalPayments,
				transaction_count: transactions.length,
				transactions: transactions.reverse(), // Show most recent first
			};
		} catch (error) {
			console.error(
				`Error calculating balance for account ${account.name}:`,
				error,
			);
			return {
				id: account.id,
				name: account.name,
				currency: account.currency,
				initial_balance: account.initial_balance,
				current_balance: account.initial_balance,
				total_expenses: 0,
				total_payments: 0,
				transaction_count: 0,
				transactions: [],
			};
		}
	};

	const toggleAccountExpansion = (accountId: string) => {
		const newExpanded = new Set(expandedAccounts);
		if (newExpanded.has(accountId)) {
			newExpanded.delete(accountId);
		} else {
			newExpanded.add(accountId);
		}
		setExpandedAccounts(newExpanded);
	};

	const getTransactionIcon = (type: string) => {
		switch (type) {
			case "income":
			case "payment":
			case "transfer_in":
				return <ArrowUpRight className="size-4 text-green-600" />;
			case "expense":
			case "transfer_out":
				return <ArrowDownLeft className="size-4 text-red-600" />;
			default:
				return <DollarSign className="size-4 text-gray-600" />;
		}
	};

	const exportToCSV = () => {
		const csvContent = [
			[
				"Account",
				"Currency",
				"Initial Balance",
				"Current Balance",
				"Total Income",
				"Total Expenses",
				"Total Payments",
				"Net Change",
				"Transactions",
			],
			...accounts.map((acc) => [
				acc.name,
				acc.currency,
				acc.initial_balance,
				acc.current_balance,
				acc.total_expenses,
				acc.total_payments,
				acc.current_balance - acc.initial_balance,
				acc.transaction_count,
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `comprehensive-financial-report-${new Date().toISOString().split("T")[0]}.csv`;
		a.click();
		window.URL.revokeObjectURL(url);
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<SectionLoader />
			</div>
		);
	}

	return (
		<div className="space-y-6 px-0 sm:px-4">
			{/* Filters */}
			<Card className="px-4">
				<CardHeader className="px-0 sm:px-2">
					<CardTitle className="flex items-center gap-2 text-md sm:text-lg">
						<Calendar className="size-5" />
						Financial Report Filters
					</CardTitle>
				</CardHeader>
				<CardContent className="px-0 sm:px-2">
					<div className="grid grid-cols-1 md:grid-cols-5 gap-2">
						<div>
							<Label htmlFor="location">Location</Label>
							<Select
								value={selectedLocation}
								onValueChange={setSelectedLocation}
							>
								<SelectTrigger>
									<SelectValue placeholder="All Locations" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Locations</SelectItem>
									{locations.map((location) => (
										<SelectItem key={location.id} value={location.id}>
											{location.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="currency">Base Currency</Label>
							<Select
								value={baseCurrency}
								onValueChange={(value: "LKR" | "USD") => setBaseCurrency(value)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="LKR">LKR</SelectItem>
									<SelectItem value="USD">USD</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div>
							<Label htmlFor="date_from">Start Date</Label>
							<Input
								id="date_from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="date_to">End Date</Label>
							<Input
								id="date_to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
							/>
						</div>
						<div className="flex items-end gap-2">
							<Button onClick={fetchComprehensiveData} className="flex-1">
								<RefreshCw className="size-4 mr-2" />
								Refresh
							</Button>
							<Button onClick={exportToCSV} variant="outline">
								<Download className="size-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Financial Summary */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card className="bg-green-50 border-green-200">
					<CardContent className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-green-600">
									Total Income
								</p>
								<p className="text-lg sm:text-2xl font-bold text-green-900">
									{formatCurrency(summary.totalPayments, baseCurrency)}
								</p>
							</div>
							<TrendingUp className="size-4 text-green-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-blue-50 border-blue-200">
					<CardContent className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-blue-600">
									Reservation Payments
								</p>
								<p className="text-lg sm:text-2xl  font-bold text-blue-900">
									{formatCurrency(summary.totalPayments, baseCurrency)}
								</p>
							</div>
							<CreditCard className="size-4 text-blue-600" />
						</div>
					</CardContent>
				</Card>

				<Card className="bg-red-50 border-red-200">
					<CardContent className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-red-600">
									Total Expenses
								</p>
								<p className="text-lg sm:text-2xl font-bold text-red-900">
									{formatCurrency(summary.totalExpenses, baseCurrency)}
								</p>
							</div>
							<TrendingDown className="size-4 text-red-600" />
						</div>
					</CardContent>
				</Card>

				<Card
					className={`${summary.netProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
				>
					<CardContent className="p-3 sm:p-6">
						<div className="flex items-center justify-between">
							<div>
								<p
									className={`text-sm font-medium ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
								>
									Net Profit
								</p>
								<p
									className={`text-lg sm:text-2xl font-bold ${summary.netProfit >= 0 ? "text-emerald-900" : "text-red-900"}`}
								>
									{formatCurrency(summary.netProfit, baseCurrency)}
								</p>
								<p
									className={`text-sm ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
								>
									{summary.profitMargin.toFixed(1)}% margin
								</p>
							</div>
							<DollarSign
								className={`size-4 ${summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}
							/>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Account Details */}
			<Card>
				<CardHeader className="px-2">
					<CardTitle className="flex items-center gap-2 text-md sm:text-lg">
						<Building2 className="size-6" />
						Account Balances & Transaction History
					</CardTitle>
					<CardDescription>
						Running balances for all accounts with complete transaction history
					</CardDescription>
				</CardHeader>
				<CardContent className="px-2">
					<div className="space-y-4">
						{accounts.map((account) => (
							<Card
								key={account.id}
								className="px-0 border-l-2 sm:border-l-4 border-l-primary"
							>
								<Collapsible
									open={expandedAccounts.has(account.id)}
									onOpenChange={() => toggleAccountExpansion(account.id)}
								>
									<CollapsibleTrigger asChild>
										<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
											<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
												<div className="flex items-start sm:items-center gap-3">
													<div className="flex flex-col">
														<CardTitle className="text-md sm:text-lg">
															{account.name}
														</CardTitle>
														<CardDescription className="flex items-center gap-2">
															<Badge variant="outline">
																{account.currency}
															</Badge>
															<span>
																{account.transaction_count} transactions
															</span>
														</CardDescription>
													</div>
													{expandedAccounts.has(account.id) ? (
														<ChevronDown className="size-4" />
													) : (
														<ChevronRight className="size-4" />
													)}
												</div>
												<div className="text-left sm:text-right flex flex-col items-start sm:items-end">
													<p className="text-lg sm:text-2xl font-bold">
														{formatCurrency(
															account.current_balance,
															account.currency as any,
														)}
													</p>
													<div className="flex pt-4 sm:pt-0 flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-muted-foreground">
														<span className="text-green-600">
															Income:{" "}
															{formatCurrency(
																account.total_payments,
																account.currency as any,
															)}
														</span>
														<span className="text-red-600">
															Expenses:{" "}
															{formatCurrency(
																account.total_expenses,
																account.currency as any,
															)}
														</span>
													</div>
												</div>
											</div>
										</CardHeader>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<CardContent className="pt-0">
											<div className="space-y-2 max-h-96 overflow-y-auto">
												{account.transactions.length === 0 ? (
													<p className="text-start sm:text-center text-muted-foreground py-8">
														No transactions found for selected period
													</p>
												) : (
													account.transactions.map((txn, index) => (
														<div
															key={`${txn.id}-${index}`}
															className="flex items-center justify-between p-1 sm:p-3 border rounded-lg hover:bg-muted/50 transition-colors"
														>
															<div className="flex items-center gap-3">
																{getTransactionIcon(txn.type)}
																<div>
																	<div className="font-medium">
																		{txn.description}
																	</div>
																	<div className="text-sm text-muted-foreground">
																		{new Date(txn.date).toLocaleDateString()}
																		{txn.note && <span> • {txn.note}</span>}
																	</div>
																</div>
															</div>
															<div className="text-left sm:text-right">
																<p
																	className={`font-semibold ${
																		txn.type === "payment" ||
																		txn.type === "transfer_in"
																			? "text-green-600"
																			: "text-red-600"
																	}`}
																>
																	{txn.type === "payment" ||
																	txn.type === "transfer_in"
																		? "+"
																		: "-"}
																	{formatCurrency(
																		txn.amount,
																		txn.currency as any,
																	)}
																</p>
																<div className="text-sm text-muted-foreground">
																	Balance:{" "}
																	{formatCurrency(
																		txn.running_balance,
																		txn.currency as any,
																	)}
																</div>
															</div>
														</div>
													))
												)}
											</div>
										</CardContent>
									</CollapsibleContent>
								</Collapsible>
							</Card>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
