import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";
import { ExpenseSkeleton } from "@/components/ExpenseSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useExpenseData } from "@/hooks/useExpenseData";
import { ExpenseForm, ExpenseHistoryTable, ExpenseShortcutsSection } from "@/components/expense";
import { useTranslation } from "react-i18next";
import { useLocationContext } from "@/context/LocationContext";

export default function Expense() {
	const { t } = useTranslation();
	const { hasAnyPermission } = usePermissions();
	const { selectedLocation } = useLocationContext();
	const [selectedLocationId, setSelectedLocationId] = useState<string>(selectedLocation || "");
	
	// Use the custom hook for data fetching
	const {
		locations,
		accounts,
		expenseTypes,
		recentExpenses,
		loading,
		refetch,
	} = useExpenseData();

	const handleQuickFill = (data: {
		mainCategory: string;
		subCategory: string;
		amount: string;
		accountId: string;
		date: string;
		note: string;
	}) => {
		// This would typically update form state in the ExpenseForm component
		// For now, we'll let the ExpenseForm handle this internally
		console.log("Quick fill data:", data);
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
						{t('expense.permissionDenied')}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header with back button */}
			<div className="flex items-center gap-4">
				<h1 className="text-2xl font-bold">{t('expense.title')}</h1>
				{hasAnyPermission("access_reports") && (
					<Button asChild variant="outline" className="ml-auto">
						<Link to="/reports?tab=comprehensive&type=expense">
							{t('expense.viewAllExpenses')}
						</Link>
					</Button>
				)}
			</div>

			{/* Expense Form */}
			<ExpenseForm 
				locations={locations}
				accounts={accounts}
				expenseTypes={expenseTypes}
				onSuccess={refetch}
				onLocationChange={setSelectedLocationId}
			/>

			{/* Expense Shortcuts */}
			{selectedLocationId && (
				<ExpenseShortcutsSection 
					locationId={selectedLocationId}
					accounts={accounts}
					onQuickFill={handleQuickFill}
				/>
			)}

			{/* Recent Expenses */}
			<ExpenseHistoryTable 
				expenses={recentExpenses}
				accounts={accounts}
			/>
		</div>
	);
}