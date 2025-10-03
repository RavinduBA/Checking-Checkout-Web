import { Tables } from "@/integrations/supabase/types";
import { AccountCard } from "./AccountCard";

type Account = Tables<"accounts">;
type Balance = Tables<"account_balances">;

interface AccountWithBalance extends Account {
	balances: Balance[];
}

interface AccountGridProps {
	accounts: AccountWithBalance[];
	onEdit: (account: Account) => void;
	onDelete: (accountId: string) => void;
}

export function AccountGrid({ accounts, onEdit, onDelete }: AccountGridProps) {
	// Calculate account balance from balances property
	const calculateAccountBalance = (account: AccountWithBalance) => {
		if (!account.balances || account.balances.length === 0) {
			return account.initial_balance;
		}
		return account.balances[0]?.current_balance || account.initial_balance;
	};

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{accounts.map((account) => (
				<AccountCard
					key={account.id}
					account={account}
					balance={calculateAccountBalance(account)}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
