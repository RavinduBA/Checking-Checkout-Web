import { useTranslation } from "react-i18next";
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
	const { t } = useTranslation();
	
	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("income.historyTable.title")}</CardTitle>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("income.historyTable.headers.date")}</TableHead>
							<TableHead>{t("income.historyTable.headers.note")}</TableHead>
							<TableHead>{t("income.historyTable.headers.type")}</TableHead>
							<TableHead>{t("income.historyTable.headers.amount")}</TableHead>
							<TableHead>{t("income.historyTable.headers.account")}</TableHead>
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