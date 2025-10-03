import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Account = Tables<"accounts">;
type Balance = Tables<"account_balances">;

interface AccountWithBalance extends Account {
	balances: Balance[];
}

interface AccountSummaryCardsProps {
	accounts: AccountWithBalance[];
}

export function AccountSummaryCards({ accounts }: AccountSummaryCardsProps) {
	// Calculate balances from the balances property
	const calculateAccountBalance = (account: AccountWithBalance) => {
		if (!account.balances || account.balances.length === 0) {
			return account.initial_balance;
		}
		return account.balances[0]?.current_balance || account.initial_balance;
	};

	const totalLKRBalance = accounts
		.filter((account) => account.currency === "LKR")
		.reduce((sum, account) => sum + calculateAccountBalance(account), 0);

	const totalUSDBalance = accounts
		.filter((account) => account.currency === "USD")
		.reduce((sum, account) => sum + calculateAccountBalance(account), 0);

	return (
		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Accounts
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{accounts.length}</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Balance (LKR)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						Rs. {totalLKRBalance.toLocaleString()}
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						Total Balance (USD)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">
						$ {totalUSDBalance.toLocaleString()}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
