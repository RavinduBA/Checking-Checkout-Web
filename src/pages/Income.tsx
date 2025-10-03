import { AlertCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IncomeSkeleton } from "@/components/IncomeSkeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIncomeData } from "@/hooks/useIncomeData";
import { usePermissions } from "@/hooks/usePermissions";
import { useIncomeHistory } from "@/hooks/useIncomeHistory";
import { useReservationIncomeMapping } from "@/hooks/useReservationIncomeMapping";
import {
	ReservationsTable,
	IncomeHistoryTable,
	AddIncomeDialog,
} from "@/components/reservation";

type Database = any;
type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

const Income = () => {
	const { t } = useTranslation();
	const { hasAnyPermission } = usePermissions();
	const { reservations, rooms, accounts, loading, refetch } = useIncomeData();
	const { incomeHistory, refetch: refetchIncomeHistory } = useIncomeHistory();
	const { reservationIncomeMap, refetch: refetchIncomeMapping } = useReservationIncomeMapping();

	const [isIncomeDialogOpen, setIsIncomeDialogOpen] = useState(false);
	const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

	const handleAddIncome = (reservation: Reservation) => {
		setSelectedReservation(reservation);
		setIsIncomeDialogOpen(true);
	};

	const handleIncomeSuccess = () => {
		refetchIncomeHistory();
		refetchIncomeMapping();
		refetch();
	};

	const handleCloseDialog = () => {
		setIsIncomeDialogOpen(false);
		setSelectedReservation(null);
	};

	if (!hasAnyPermission(["access_income"])) {
		return (
			<div className="p-6">
				<Alert>
					<AlertCircle className="size-4" />
					<AlertDescription>
						{t("income.permissionDenied")}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (loading) return <IncomeSkeleton />;

	return (
		<div className="p-6 space-y-6">
			<h1 className="text-2xl font-bold">{t("income.title")}</h1>

			<ReservationsTable
				reservations={reservations}
				rooms={rooms}
				reservationIncomeMap={reservationIncomeMap}
				onAddIncome={handleAddIncome}
			/>

			<IncomeHistoryTable incomeHistory={incomeHistory} />

			<AddIncomeDialog
				isOpen={isIncomeDialogOpen}
				onClose={handleCloseDialog}
				selectedReservation={selectedReservation}
				accounts={accounts}
				onSuccess={handleIncomeSuccess}
			/>
		</div>
	);
};

export default Income;