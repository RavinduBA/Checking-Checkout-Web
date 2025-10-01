import { ArrowRightLeft, Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineLoader, SectionLoader } from "@/components/ui/loading-spinner";
import { AccountsSkeleton } from "@/components/AccountsSkeleton";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type Location = Tables<"locations">;

export default function Accounts() {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { tenant } = useTenant();
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [locations, setLocations] = useState<Location[]>([]);
	const [loading, setLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [accountBalances, setAccountBalances] = useState<
		Record<string, number>
	>({});
	const [currentExchangeRate, setCurrentExchangeRate] = useState({
		usdToLkr: 300,
		lkrToUsd: 0.0033,
	});
	const [editingAccount, setEditingAccount] = useState<Account | null>(null);
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [formData, setFormData] = useState({
		name: "",
		currency: "LKR" as "LKR" | "USD",
		initial_balance: 0,
		location_access: [] as string[],
	});
	const [showTransferDialog, setShowTransferDialog] = useState(false);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
	const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
	const [transferData, setTransferData] = useState({
		fromAccountId: "",
		toAccountId: "",
		amount: 0,
		conversionRate: 1,
		note: "",
	});

	const fetchData = useCallback(async () => {
		try {
			// Use optimized single query approach instead of N+1 queries
			const [accountsResponse, locationsResponse, balancesResponse] =
				await Promise.all([
					supabase
						.from("accounts")
						.select("*")
						.order("created_at", { ascending: false }),
					supabase.from("locations").select("*").eq("is_active", true),
					// Get all balance data in parallel optimized queries using the new indexes
					Promise.all([
						supabase
							.from("income")
							.select("account_id, amount")
							.not("account_id", "is", null),
						supabase.from("expenses").select("account_id, amount"),
						supabase
							.from("account_transfers")
							.select("to_account_id, amount, conversion_rate"),
						supabase
							.from("account_transfers")
							.select("from_account_id, amount"),
					]),
				]);

			if (accountsResponse.error) throw accountsResponse.error;
			if (locationsResponse.error) throw locationsResponse.error;

			const accounts = accountsResponse.data || [];
			const [
				incomeData,
				expensesData,
				incomingTransfersData,
				outgoingTransfersData,
			] = await balancesResponse;

			// Process balance data efficiently
			const incomeByAccount =
				incomeData.data?.reduce(
					(acc, item) => {
						if (item.account_id) {
							acc[item.account_id] = (acc[item.account_id] || 0) + item.amount;
						}
						return acc;
					},
					{} as Record<string, number>,
				) || {};

			const expensesByAccount =
				expensesData.data?.reduce(
					(acc, item) => {
						acc[item.account_id] = (acc[item.account_id] || 0) + item.amount;
						return acc;
					},
					{} as Record<string, number>,
				) || {};

			const incomingTransfersByAccount =
				incomingTransfersData.data?.reduce(
					(acc, item) => {
						acc[item.to_account_id] =
							(acc[item.to_account_id] || 0) +
							item.amount * item.conversion_rate;
						return acc;
					},
					{} as Record<string, number>,
				) || {};

			const outgoingTransfersByAccount =
				outgoingTransfersData.data?.reduce(
					(acc, item) => {
						acc[item.from_account_id] =
							(acc[item.from_account_id] || 0) + item.amount;
						return acc;
					},
					{} as Record<string, number>,
				) || {};

			// Calculate final balances
			const balances: Record<string, number> = {};
			accounts.forEach((account) => {
				balances[account.id] =
					account.initial_balance +
					(incomeByAccount[account.id] || 0) -
					(expensesByAccount[account.id] || 0) +
					(incomingTransfersByAccount[account.id] || 0) -
					(outgoingTransfersByAccount[account.id] || 0);
			});

			setAccounts(accounts);
			setAccountBalances(balances);
			setLocations(locationsResponse.data || []);
		} catch (error) {
			console.error("Error fetching data:", error);
			toast({
				title: "Error",
				description: "Failed to fetch accounts data",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Removed calculateAccountBalances function - now using optimized account_balances view
	// This eliminates the N+1 query problem by calculating all balances in a single database query

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		setIsSubmitting(true);

		if (!tenant?.id) {
			toast({
				title: "Error",
				description: "No tenant selected. Please refresh the page.",
				variant: "destructive",
			});
			setIsSubmitting(false);
			return;
		}

		try {
			if (editingAccount) {
				const { error } = await supabase
					.from("accounts")
					.update(formData)
					.eq("id", editingAccount.id);
				if (error) throw error;
				toast({
					title: "Success",
					description: "Account updated successfully",
				});
			} else {
				const { error } = await supabase.from("accounts").insert([
					{
						...formData,
						tenant_id: tenant?.id,
					},
				]);
				if (error) throw error;
				toast({ title: "Success", description: "Account added successfully" });
			}

			resetForm();
			fetchData();
		} catch (error) {
			console.error("Error saving account:", error);
			toast({
				title: "Error",
				description: "Failed to save account",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = (id: string) => {
		setAccountToDelete(id);
		setDeleteConfirmOpen(true);
	};

	const confirmDelete = async () => {
		if (!accountToDelete || isDeleting) return;
		setIsDeleting(true);

		try {
			const { error } = await supabase
				.from("accounts")
				.delete()
				.eq("id", accountToDelete);
			if (error) throw error;
			toast({
				title: "Success",
				description: "Account deleted successfully",
			});
			fetchData();
		} catch (error) {
			console.error("Error deleting account:", error);
			toast({
				title: "Error",
				description: "Failed to delete account",
				variant: "destructive",
			});
		} finally {
			setDeleteConfirmOpen(false);
			setAccountToDelete(null);
			setIsDeleting(false);
		}
	};

	const resetForm = () => {
		setFormData({
			name: "",
			currency: "LKR",
			initial_balance: 0,
			location_access: [],
		});
		setEditingAccount(null);
		setShowAddDialog(false);
	};

	const startEdit = (account: Account) => {
		setFormData({
			name: account.name,
			currency: account.currency as "LKR" | "USD",
			initial_balance: account.initial_balance,
			location_access: account.location_access,
		});
		setEditingAccount(account);
		setShowAddDialog(true);
	};

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isTransferring) return;
		setIsTransferring(true);
		try {
			const { error } = await supabase.from("account_transfers").insert([
				{
					from_account_id: transferData.fromAccountId,
					to_account_id: transferData.toAccountId,
					amount: transferData.amount,
					conversion_rate: transferData.conversionRate,
					note: transferData.note,
				},
			]);

			if (error) throw error;

			toast({
				title: "Success",
				description: "Transfer completed successfully",
			});

			setTransferData({
				fromAccountId: "",
				toAccountId: "",
				amount: 0,
				conversionRate: 1,
				note: "",
				});
				setShowTransferDialog(false);
			} catch (error) {
				console.error("Error creating transfer:", error);
				toast({
					title: "Error",
					description: "Failed to complete transfer",
					variant: "destructive",
				});
			} finally {
				setIsTransferring(false);
			}
		};	const getExchangeRate = (fromCurrency: string, toCurrency: string) => {
		if (fromCurrency === toCurrency) return 1;
		if (fromCurrency === "USD" && toCurrency === "LKR")
			return currentExchangeRate.usdToLkr;
		if (fromCurrency === "LKR" && toCurrency === "USD")
			return currentExchangeRate.lkrToUsd;
		return 1;
	};

	const handleFromAccountChange = (accountId: string) => {
		const fromAccount = accounts.find((acc) => acc.id === accountId);
		const toAccount = accounts.find(
			(acc) => acc.id === transferData.toAccountId,
		);

		if (fromAccount && toAccount) {
			const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
			setTransferData({
				...transferData,
				fromAccountId: accountId,
				conversionRate: rate,
			});
		} else {
			setTransferData({
				...transferData,
				fromAccountId: accountId,
			});
		}
	};

	const handleToAccountChange = (accountId: string) => {
		const fromAccount = accounts.find(
			(acc) => acc.id === transferData.fromAccountId,
		);
		const toAccount = accounts.find((acc) => acc.id === accountId);

		if (fromAccount && toAccount) {
			const rate = getExchangeRate(fromAccount.currency, toAccount.currency);
			setTransferData({
				...transferData,
				toAccountId: accountId,
				conversionRate: rate,
			});
		} else {
			setTransferData({
				...transferData,
				toAccountId: accountId,
			});
		}
	};

	if (loading) {
		return <AccountsSkeleton />;
	}

	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center gap-4">
				<div className="flex gap-2">
					<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
						<DialogTrigger asChild>
							<Button onClick={() => resetForm()}>
								<Plus className="size-4 mr-2" />
								Add Account
							</Button>
						</DialogTrigger>
					</Dialog>
					<Dialog
						open={showTransferDialog}
						onOpenChange={setShowTransferDialog}
					>
						<DialogTrigger asChild>
							<Button variant="outline">
								<ArrowRightLeft className="size-4 mr-2" />
								Transfer Money
							</Button>
						</DialogTrigger>
					</Dialog>
				</div>
				<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>
								{editingAccount ? "Edit Account" : "Add New Account"}
							</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<Label htmlFor="name">Account Name</Label>
								<Input
									id="name"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									required
								/>
							</div>
							<div>
								<Label htmlFor="currency">Currency</Label>
								<Select
									value={formData.currency}
									onValueChange={(value: "LKR" | "USD") =>
										setFormData({ ...formData, currency: value })
									}
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
								<Label htmlFor="initial_balance">Initial Balance</Label>
								<Input
									id="initial_balance"
									type="number"
									step="0.01"
									value={formData.initial_balance}
									onChange={(e) =>
										setFormData({
											...formData,
											initial_balance: parseFloat(e.target.value) || 0,
										})
									}
								/>
							</div>
							<div>
								<Label htmlFor="location_access">Location Access</Label>
								<div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
									{locations.map((location) => (
										<div
											key={location.id}
											className="flex items-center space-x-2"
										>
											<input
												type="checkbox"
												id={location.id}
												checked={formData.location_access.includes(location.id)}
												onChange={(e) => {
													if (e.target.checked) {
														setFormData({
															...formData,
															location_access: [
																...formData.location_access,
																location.id,
															],
														});
													} else {
														setFormData({
															...formData,
															location_access: formData.location_access.filter(
																(id) => id !== location.id,
															),
														});
													}
												}}
											/>
											<Label htmlFor={location.id} className="text-sm">
												{location.name}
											</Label>
										</div>
									))}
								</div>
							</div>
							<div className="flex gap-2">
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting 
										? (editingAccount ? "Updating..." : "Adding...") 
										: (editingAccount ? "Update Account" : "Add Account")
									}
								</Button>
								<Button type="button" variant="outline" onClick={resetForm}>
									Cancel
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>

				<Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Transfer Money Between Accounts</DialogTitle>
						</DialogHeader>
						<form onSubmit={handleTransfer} className="space-y-4">
							<div>
								<Label htmlFor="fromAccount">From Account</Label>
								<Select
									value={transferData.fromAccountId}
									onValueChange={handleFromAccountChange}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select source account" />
									</SelectTrigger>
									<SelectContent>
										{accounts.map((account) => (
											<SelectItem key={account.id} value={account.id}>
												<div className="flex justify-between items-center w-full">
													<span>
														{account.name} ({account.currency})
													</span>
													<span className="text-muted-foreground ml-2">
														Balance: {account.currency === "LKR" ? "Rs." : "$"}
														{(
															accountBalances[account.id] || 0
														).toLocaleString()}
													</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="toAccount">To Account</Label>
								<Select
									value={transferData.toAccountId}
									onValueChange={handleToAccountChange}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select destination account" />
									</SelectTrigger>
									<SelectContent>
										{accounts
											.filter((acc) => acc.id !== transferData.fromAccountId)
											.map((account) => (
												<SelectItem key={account.id} value={account.id}>
													<div className="flex justify-between items-center w-full">
														<span>
															{account.name} ({account.currency})
														</span>
														<span className="text-muted-foreground ml-2">
															Balance:{" "}
															{account.currency === "LKR" ? "Rs." : "$"}
															{(
																accountBalances[account.id] || 0
															).toLocaleString()}
														</span>
													</div>
												</SelectItem>
											))}
									</SelectContent>
								</Select>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<Label htmlFor="usdToLkr">USD to LKR Rate</Label>
									<Input
										id="usdToLkr"
										type="number"
										step="0.01"
										value={currentExchangeRate.usdToLkr}
										onChange={(e) =>
											setCurrentExchangeRate({
												...currentExchangeRate,
												usdToLkr: parseFloat(e.target.value) || 300,
												lkrToUsd: 1 / (parseFloat(e.target.value) || 300),
											})
										}
									/>
								</div>
								<div>
									<Label htmlFor="lkrToUsd">LKR to USD Rate</Label>
									<Input
										id="lkrToUsd"
										type="number"
										step="0.0001"
										value={currentExchangeRate.lkrToUsd}
										onChange={(e) =>
											setCurrentExchangeRate({
												...currentExchangeRate,
												lkrToUsd: parseFloat(e.target.value) || 0.0033,
												usdToLkr: 1 / (parseFloat(e.target.value) || 0.0033),
											})
										}
									/>
								</div>
							</div>

							<div>
								<Label htmlFor="amount">Amount</Label>
								<Input
									id="amount"
									type="number"
									step="0.01"
									value={transferData.amount}
									onChange={(e) =>
										setTransferData({
											...transferData,
											amount: parseFloat(e.target.value) || 0,
										})
									}
									required
								/>
							</div>

							{(() => {
								const fromAccount = accounts.find(
									(acc) => acc.id === transferData.fromAccountId,
								);
								const toAccount = accounts.find(
									(acc) => acc.id === transferData.toAccountId,
								);
								return (
									fromAccount &&
									toAccount &&
									fromAccount.currency !== toAccount.currency && (
										<div>
											<Label htmlFor="conversionRate">
												Conversion Rate ({fromAccount.currency} to{" "}
												{toAccount.currency})
											</Label>
											<Input
												id="conversionRate"
												type="number"
												step="0.0001"
												value={transferData.conversionRate}
												onChange={(e) =>
													setTransferData({
														...transferData,
														conversionRate: parseFloat(e.target.value) || 1,
													})
												}
												required
											/>
											<p className="text-sm text-muted-foreground mt-1">
												{transferData.amount} {fromAccount.currency} ={" "}
												{(
													transferData.amount * transferData.conversionRate
												).toFixed(2)}{" "}
												{toAccount.currency}
											</p>
										</div>
									)
								);
							})()}

							<div>
								<Label htmlFor="note">Note (Optional)</Label>
								<Input
									id="note"
									value={transferData.note}
									onChange={(e) =>
										setTransferData({ ...transferData, note: e.target.value })
									}
									placeholder="Transfer description..."
								/>
							</div>

							<div className="flex gap-2">
								<Button type="submit" disabled={isTransferring}>
									{isTransferring ? "Transferring..." : "Complete Transfer"}
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => setShowTransferDialog(false)}
								>
									Cancel
								</Button>
							</div>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* Account Cards */}
			<div className="grid gap-4">
				{accounts.map((account) => (
					<Card key={account.id} className="border-2">
						<CardHeader className="flex flex-row items-center justify-between">
							<CardTitle className="text-lg">{account.name}</CardTitle>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => startEdit(account)}
								>
									<Edit className="size-4" />
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => handleDelete(account.id)}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="font-medium">Currency:</span>{" "}
									{account.currency}
								</div>
								<div>
									<span className="font-medium">Current Balance:</span>{" "}
									{account.currency === "LKR" ? "Rs." : "$"}
									{(accountBalances[account.id] || 0).toLocaleString()}
								</div>
								<div>
									<span className="font-medium">Initial Balance:</span>{" "}
									{account.currency === "LKR" ? "Rs." : "$"}
									{account.initial_balance.toLocaleString()}
								</div>
								<div className="col-span-2">
									<span className="font-medium">Location Access:</span>{" "}
									{account.location_access.length &&
										locations
											.filter((loc) => account.location_access.includes(loc.id))
											.map((loc) => loc.name)
											.join(", ")}
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Transfer History */}
			<Card className="border-2">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ArrowRightLeft className="size-5" />
						Recent Transfers
					</CardTitle>
				</CardHeader>
				<CardContent>
					<TransferHistory />
				</CardContent>
			</Card>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this account? This action cannot
							be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

// Transfer History Component
function TransferHistory() {
	const [transfers, setTransfers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [accounts, setAccounts] = useState<Account[]>([]);

	const fetchTransfers = useCallback(async () => {
		try {
			const [transfersResponse, accountsResponse] = await Promise.all([
				supabase
					.from("account_transfers")
					.select("*")
					.order("created_at", { ascending: false })
					.limit(20),
				supabase.from("accounts").select("*"),
			]);

			setTransfers(transfersResponse.data || []);
			setAccounts(accountsResponse.data || []);
		} catch (error) {
			console.error("Error fetching transfers:", error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchTransfers();
	}, [fetchTransfers]);

	const getAccountName = (accountId: string) => {
		return (
			accounts.find((acc) => acc.id === accountId)?.name || "Unknown Account"
		);
	};

	const getAccountCurrency = (accountId: string) => {
		return accounts.find((acc) => acc.id === accountId)?.currency || "LKR";
	};

	if (loading) {
		return <InlineLoader />;
	}

	if (transfers.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-muted-foreground">No transfers found</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{transfers.map((transfer) => (
				<div key={transfer.id} className="p-4 border border-border rounded-lg">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<ArrowRightLeft className="size-4 text-muted-foreground" />
							<span className="font-medium">
								{getAccountName(transfer.from_account_id)} →{" "}
								{getAccountName(transfer.to_account_id)}
							</span>
						</div>
						<div className="text-right">
							<div className="font-medium">
								{getAccountCurrency(transfer.from_account_id) === "LKR"
									? "Rs."
									: "$"}
								{transfer.amount.toLocaleString()}
							</div>
							{transfer.conversion_rate !== 1 && (
								<div className="text-sm text-muted-foreground">
									Rate: {transfer.conversion_rate} ={" "}
									{getAccountCurrency(transfer.to_account_id) === "LKR"
										? "Rs."
										: "$"}
									{(
										transfer.amount * transfer.conversion_rate
									).toLocaleString()}
								</div>
							)}
						</div>
					</div>
					<div className="flex items-center justify-between text-sm text-muted-foreground">
						<span>{new Date(transfer.created_at).toLocaleDateString()}</span>
						{transfer.note && <span>{transfer.note}</span>}
					</div>
				</div>
			))}
		</div>
	);
}
