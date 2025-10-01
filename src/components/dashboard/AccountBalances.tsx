import { DollarSign } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLoader } from "@/components/ui/loading-spinner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Account = Tables<"accounts">;

interface AccountBalancesProps {
	selectedLocation: string;
}

export function AccountBalances({ selectedLocation }: AccountBalancesProps) {
	const [loading, setLoading] = useState(true);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [accountBalances, setAccountBalances] = useState<
		Record<string, number>
	>({});
	const { tenant } = useAuth();

	const calculateAccountBalances = useCallback(async (accountsList: Account[]) => {
		const balances: Record<string, number> = {};

		for (const account of accountsList) {
			let balance = account.initial_balance;

			// Add income
			const { data: income } = await supabase
				.from("income")
				.select("amount")
				.eq("account_id", account.id);

			// Subtract expenses
			const { data: expenses } = await supabase
				.from("expenses")
				.select("amount")
				.eq("account_id", account.id);

			// Add incoming transfers
			const { data: incomingTransfers } = await supabase
				.from("account_transfers")
				.select("amount, conversion_rate")
				.eq("to_account_id", account.id);

			// Subtract outgoing transfers
			const { data: outgoingTransfers } = await supabase
				.from("account_transfers")
				.select("amount")
				.eq("from_account_id", account.id);

			balance += (income || []).reduce((sum, item) => sum + item.amount, 0);
			balance -= (expenses || []).reduce((sum, item) => sum + item.amount, 0);
			balance += (incomingTransfers || []).reduce(
				(sum, item) => sum + item.amount * item.conversion_rate,
				0,
			);
			balance -= (outgoingTransfers || []).reduce(
				(sum, item) => sum + item.amount,
				0,
			);

			balances[account.id] = balance;
		}

		setAccountBalances(balances);
	}, []);

	useEffect(() => {
		const fetchAccountData = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				// Get locations for the tenant first to filter by tenant
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					setAccounts([]);
					setLoading(false);
					return;
				}

				const { data: accountsData } = await supabase
					.from("accounts")
					.select("*");

				// Filter accounts to only those that have access to tenant's locations
				const filteredAccounts = (accountsData || []).filter((account) =>
					account.location_access.some((locationId) =>
						tenantLocationIds.includes(locationId),
					),
				);

				setAccounts(filteredAccounts);

				// Calculate account balances
				await calculateAccountBalances(filteredAccounts);
			} catch (error) {
				console.error("Error fetching account data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchAccountData();
	}, [tenant?.id, calculateAccountBalances]);

	if (loading) {
		return <SectionLoader className="h-32" />;
	}
	return (
		<Card className="bg-card border">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<DollarSign className="size-5 text-primary" />
					Account Balances
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3 lg:space-y-4">
				{accounts.map((account, index) => (
					<div
						key={index}
						className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
					>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-foreground truncate">
								{account.name}
							</p>
							<p className="text-sm text-muted-foreground">
								{account.currency} Account
							</p>
						</div>
						<div className="text-right ml-4">
							<p className="font-bold text-lg">
								{getCurrencySymbol(account.currency)}
								{(accountBalances[account.id] || 0).toLocaleString()}
							</p>
							<Badge variant="outline" className="mt-1">
								{account.currency}
							</Badge>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
}