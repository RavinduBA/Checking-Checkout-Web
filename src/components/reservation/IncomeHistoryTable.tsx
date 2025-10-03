import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

type Database = any;
type Income = Database["public"]["Tables"]["income"]["Row"];

interface IncomeHistoryTableProps {
	incomeHistory: Income[];
}

export function IncomeHistoryTable({ incomeHistory }: IncomeHistoryTableProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Income History</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Date</TableHead>
							<TableHead>Note</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Amount</TableHead>
							<TableHead>Account</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{incomeHistory.map((income) => (
							<TableRow key={income.id}>
								<TableCell>
									{new Date(income.created_at).toLocaleDateString()}
								</TableCell>
								<TableCell>{income.note}</TableCell>
								<TableCell>{income.income_types?.type_name || "-"}</TableCell>
								<TableCell>LKR {income.amount.toLocaleString()}</TableCell>
								<TableCell>{income.accounts?.name || "-"}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}