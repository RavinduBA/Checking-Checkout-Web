import { ArrowDownCircle, ArrowUpCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface SummaryCardsProps {
	todayIncome: number;
	todayExpenses: number;
	weeklyIncome: number;
	weeklyExpenses: number;
	selectedLocation: string;
	selectedMonth: string;
	locations: Location[];
}

export function SummaryCards({
	todayIncome,
	todayExpenses,
	weeklyIncome,
	weeklyExpenses,
	selectedLocation,
	selectedMonth,
	locations,
}: SummaryCardsProps) {
	const profit = weeklyIncome - weeklyExpenses;
	const profitPercentage =
		weeklyIncome > 0 ? ((profit / weeklyIncome) * 100).toFixed(1) : "0";

	const locationName = locations.find((l) => l.id === selectedLocation)?.name;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth ? "Monthly Income" : "Today's Income"}
					</CardTitle>
					<ArrowUpCircle className="size-4 text-success" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-success">
						Rs.{" "}
						{(selectedMonth ? weeklyIncome : todayIncome).toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{locationName}
					</p>
				</CardContent>
			</Card>

			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth ? "Monthly Expenses" : "Today's Expenses"}
					</CardTitle>
					<ArrowDownCircle className="size-4 text-destructive" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-destructive">
						Rs.{" "}
						{(selectedMonth
							? weeklyExpenses
							: todayExpenses
						).toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{locationName}
					</p>
				</CardContent>
			</Card>

			<Card className="bg-card border">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium text-muted-foreground">
						{selectedMonth ? "Monthly Profit" : "Weekly Profit"}
					</CardTitle>
					<TrendingUp className="size-4 text-primary" />
				</CardHeader>
				<CardContent>
					<div className="text-xl lg:text-2xl font-bold text-primary">
						Rs. {profit.toLocaleString()}
					</div>
					<p className="text-xs text-muted-foreground">
						{profitPercentage}% margin
					</p>
				</CardContent>
			</Card>
		</div>
	);
}