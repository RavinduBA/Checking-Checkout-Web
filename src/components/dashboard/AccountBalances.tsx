import { DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";
import { getCurrencySymbol } from "@/utils/currency";

type Account = Tables<"accounts">;

interface AccountBalancesProps {
	accounts: Account[];
	accountBalances: Record<string, number>;
}

export function AccountBalances({ accounts, accountBalances }: AccountBalancesProps) {
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