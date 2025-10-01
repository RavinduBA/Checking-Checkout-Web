import { format } from "date-fns";
import { AlertCircle, ArrowLeft, Calendar, Minus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ExpenseShortcuts } from "@/components/ExpenseShortcuts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { ExpenseSkeleton } from "@/components/ExpenseSkeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useExpenseData } from "@/hooks/useExpenseData";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Location = Tables<"locations">;
type Account = Tables<"accounts">;
type ExpenseType = Tables<"expense_types">;
type Expense = Tables<"expenses"> & {
	locations?: Location;
	accounts?: Account;
};

export default function Expense() {
	const { toast } = useToast();
	const { hasAnyPermission, hasPermission } = usePermissions();
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Use the custom hook for data fetching
	const {
		locations,
		accounts,
		expenseTypes,
		recentExpenses,
		loading,
		refetch,
	} = useExpenseData();

	const [formData, setFormData] = useState({
		mainCategory: "",
		subCategory: "",
		amount: "",
		accountId: "",
		locationId: "",
		date: format(new Date(), "yyyy-MM-dd"),
		note: "",
	});

	const selectedAccount = accounts.find((a) => a.id === formData.accountId);
	const currencySymbol = selectedAccount?.currency
		? getCurrencySymbol(selectedAccount.currency)
		: "Rs.";

	const mainCategories = [...new Set(expenseTypes.map((et) => et.main_type))];
	const subCategories = expenseTypes
		.filter((et) => et.main_type === formData.mainCategory)
		.map((et) => et.sub_type);

	const handleQuickFill = (data: {
		mainCategory: string;
		subCategory: string;
		amount: string;
		accountId: string;
		date: string;
		note: string;
	}) => {
		console.log("Expense page - handleQuickFill received exact data:", data);

		// Update form data immediately with exact values from shortcut
		setFormData({
			...formData,
			mainCategory: data.mainCategory,
			subCategory: data.subCategory,
			amount: data.amount,
			accountId: data.accountId,
			date: data.date,
			note: data.note,
		});

		console.log("Expense page - Auto-filled form with shortcut data");
	};

	const handleMainCategoryChange = (value: string) => {
		// Only clear subCategory if this is a manual user selection, not from shortcut
		const newSubCategory =
			formData.subCategory && subCategories.includes(formData.subCategory)
				? formData.subCategory
				: "";
		setFormData({
			...formData,
			mainCategory: value,
			subCategory: newSubCategory,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			const { error } = await supabase.from("expenses").insert([
				{
					main_type: formData.mainCategory,
					sub_type: formData.subCategory,
					amount: parseFloat(formData.amount),
					account_id: formData.accountId,
					location_id: formData.locationId,
					date: formData.date,
					note: formData.note || null,
				},
			]);

			if (error) throw error;

			// Calculate new account balance
			const selectedAccount = accounts.find(
				(acc) => acc.id === formData.accountId,
			);
			if (selectedAccount) {
				// Fetch current account transactions to calculate balance
				const [
					incomesRes,
					expensesRes,
					outgoingTransfersRes,
					incomingTransfersRes,
				] = await Promise.all([
					supabase
						.from("income")
						.select("amount")
						.eq("account_id", formData.accountId),
					supabase
						.from("expenses")
						.select("amount")
						.eq("account_id", formData.accountId),
					supabase
						.from("account_transfers")
						.select("amount")
						.eq("from_account_id", formData.accountId),
					supabase
						.from("account_transfers")
						.select("amount, conversion_rate")
						.eq("to_account_id", formData.accountId),
				]);

				let currentBalance = selectedAccount.initial_balance;

				// Add all income
				const totalIncome = (incomesRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance += totalIncome;

				// Subtract all expenses (including the new one we just added)
				const totalExpenses = (expensesRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance -= totalExpenses;

				// Subtract outgoing transfers
				const totalOutgoingTransfers = (outgoingTransfersRes.data || []).reduce(
					(sum, item) => sum + parseFloat(item.amount.toString()),
					0,
				);
				currentBalance -= totalOutgoingTransfers;

				// Add incoming transfers (with conversion rate)
				const totalIncomingTransfers = (incomingTransfersRes.data || []).reduce(
					(sum, item) =>
						sum + parseFloat(item.amount.toString()) * item.conversion_rate,
					0,
				);
				currentBalance += totalIncomingTransfers;

				const currencySymbol = getCurrencySymbol(selectedAccount.currency);

				// Send SMS notification for expense
				try {
					const locationData = locations.find(
						(l) => l.id === formData.locationId,
					);

					await supabase.functions.invoke("send-sms-notification", {
						body: {
							type: "expense",
							amount: parseFloat(formData.amount),
							currency: selectedAccount.currency,
							category: `${formData.mainCategory} - ${formData.subCategory}`,
							account: selectedAccount.name,
							location: locationData?.name || "N/A",
							locationId: formData.locationId, // Added for location admin SMS
							locationPhone: locationData?.phone, // Primary SMS recipient
							date: format(new Date(formData.date), "MMM dd, yyyy"),
							note: formData.note,
							accountBalance: currentBalance,
						},
					});
				} catch (smsError) {
					console.error("SMS notification failed:", smsError);
				}

				toast({
					title: "Success",
					description: `Expense record added successfully\n${selectedAccount.name} - ${currencySymbol}${currentBalance.toLocaleString()}`,
				});
			} else {
				toast({
					title: "Success",
					description: "Expense record added successfully",
				});
			}

			// Reset form but keep locationId
			setFormData({
				mainCategory: "",
				subCategory: "",
				amount: "",
				accountId: "",
				locationId: formData.locationId, // Keep selected location
				date: format(new Date(), "yyyy-MM-dd"),
				note: "",
			});

			refetch(); // Refresh recent expenses
		} catch (error) {
			console.error("Error adding expense:", error);
			toast({
				title: "Error",
				description: "Failed to add expense record",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	if (loading) {
		return <ExpenseSkeleton />;
	}

	if (!hasAnyPermission("access_expenses")) {
		return (
			<div className="container mx-auto p-4 sm:p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertDescription>
						You don't have permission to access this page. Please contact your
						administrator.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header with back button */}
			<div className="flex items-center gap-4">
				<Button asChild variant="outline" size="icon">
					<Link to="/dashboard">
						<ArrowLeft className="h-4 w-4" />
					</Link>
				</Button>
				<h1 className="text-2xl font-bold">Expense Management</h1>
				{hasAnyPermission("access_reports") && (
					<Button asChild variant="outline" className="ml-auto">
						<Link to="/reports?tab=comprehensive&type=expense">
							View All Expenses
						</Link>
					</Button>
				)}
			</div>

			{/* Expense Form Card */}
			<Card>
				<CardHeader>
					<CardTitle>Add New Expense</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Form Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div className="space-y-2">
								<Label htmlFor="locationId">Location</Label>
								<Select
									value={formData.locationId}
									onValueChange={(value) =>
										setFormData({ ...formData, locationId: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select Location" />
									</SelectTrigger>
									<SelectContent>
										{locations.map((location) => (
											<SelectItem key={location.id} value={location.id}>
												{location.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="mainCategory">Main Category</Label>
								<Select
									key={`main-${formData.mainCategory}`}
									value={formData.mainCategory}
									onValueChange={handleMainCategoryChange}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select main category" />
									</SelectTrigger>
									<SelectContent>
										{mainCategories.map((category) => (
											<SelectItem key={category} value={category}>
												{category}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="subCategory">Sub Category</Label>
								<Select
									key={`sub-${formData.subCategory}`}
									value={formData.subCategory}
									onValueChange={(value) =>
										setFormData({ ...formData, subCategory: value })
									}
									disabled={!formData.mainCategory}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select sub category" />
									</SelectTrigger>
									<SelectContent>
										{subCategories.map((subCategory) => (
											<SelectItem key={subCategory} value={subCategory}>
												{subCategory}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="amount">Amount</Label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
										{currencySymbol}
									</span>
									<Input
										id="amount"
										type="number"
										placeholder="0.00"
										value={formData.amount}
										onChange={(e) =>
											setFormData({ ...formData, amount: e.target.value })
										}
										className="pl-10"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="accountId">Account</Label>
								<Select
									key={`account-${formData.accountId}`}
									value={formData.accountId}
									onValueChange={(value) =>
										setFormData({ ...formData, accountId: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select account" />
									</SelectTrigger>
									<SelectContent>
										{accounts
											.filter(
												(account) =>
													account.location_access.length === 0 ||
													account.location_access.includes(
														formData.locationId,
													),
											)
											.map((account) => (
												<SelectItem key={account.id} value={account.id}>
													{account.name} ({account.currency})
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="date">Date</Label>
								<div className="relative">
									<Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
									<Input
										id="date"
										type="date"
										value={formData.date}
										onChange={(e) =>
											setFormData({ ...formData, date: e.target.value })
										}
										className="pl-10"
										required
									/>
								</div>
							</div>
						</div>

						{/* Note field */}
						<div className="space-y-2">
							<Label htmlFor="note">Note</Label>
							<Textarea
								id="note"
								placeholder="Add details about this expense..."
								value={formData.note}
								onChange={(e) =>
									setFormData({ ...formData, note: e.target.value })
								}
								rows={3}
							/>
						</div>

						{/* Submit button */}
						<Button 
							type="submit" 
							disabled={!formData.locationId || isSubmitting}
						>
							<Minus className="size-4 mr-2" />
							{isSubmitting ? "Adding..." : "Add Expense"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Expense Shortcuts */}
			{formData.locationId && (
				<Card>
					<CardHeader>
						<CardTitle>Quick Expense Shortcuts</CardTitle>
					</CardHeader>
					<CardContent>
						<ExpenseShortcuts
							locationId={formData.locationId}
							accounts={accounts}
							onQuickFill={handleQuickFill}
						/>
					</CardContent>
				</Card>
			)}

			{/* Recent Expenses */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Expenses</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Amount</TableHead>
								<TableHead>Account</TableHead>
								<TableHead>Note</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{recentExpenses.map((expense) => (
								<TableRow key={expense.id}>
									<TableCell>
										{format(new Date(expense.date), "MMM dd, yyyy")}
									</TableCell>
									<TableCell>
										{expense.main_type} - {expense.sub_type}
									</TableCell>
									<TableCell>
										{expense.currency === "LKR" ? "Rs." : "$"}
										{expense.amount.toLocaleString()}
									</TableCell>
									<TableCell>
										{accounts.find((a) => a.id === expense.account_id)?.name} 
										({accounts.find((a) => a.id === expense.account_id)?.currency})
									</TableCell>
									<TableCell>
										{expense.note || "-"}
									</TableCell>
								</TableRow>
							))}
							{recentExpenses.length === 0 && (
								<TableRow>
									<TableCell colSpan={5} className="text-center py-8">
										No expense records yet. Add your first expense above!
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}