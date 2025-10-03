import { Tables } from "@/integrations/supabase/types";
import { AccountCard } from "./AccountCard";

type Account = Tables<"accounts">;

interface AccountGridProps {
	accounts: Account[];
	onEdit: (account: Account) => void;
	onDelete: (accountId: string) => void;
}

export function AccountGrid({ accounts, onEdit, onDelete }: AccountGridProps) {
	return (
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{accounts.map((account) => (
				<AccountCard
					key={account.id}
					account={account}
					balance={account.initial_balance} // For now, using initial_balance
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			))}
		</div>
	);
}
