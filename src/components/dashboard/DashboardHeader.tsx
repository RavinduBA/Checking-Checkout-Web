import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { DashboardHeaderSkeleton } from "./DashboardHeaderSkeleton";

type Location = Tables<"locations">;

interface DashboardHeaderProps {
	selectedLocation: string;
	selectedMonth: string;
	setSelectedMonth: (value: string) => void;
	hasIncomePermission: boolean;
	hasExpensePermission: boolean;
	onLocationsLoad?: (locations: Location[]) => void;
}

export function DashboardHeader({
	selectedLocation,
	selectedMonth,
	setSelectedMonth,
	hasIncomePermission,
	hasExpensePermission,
	onLocationsLoad,
}: DashboardHeaderProps) {
	const [loading, setLoading] = useState(true);
	const [locations, setLocations] = useState<Location[]>([]);
	const { tenant } = useAuth();

	// Location selection is now handled by sidebar
	useEffect(() => {
		const fetchLocations = async () => {
			if (!tenant?.id) {
				setLoading(false);
				return;
			}

			try {
				const { data: locationsData } = await supabase
					.from("locations")
					.select("*")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const fetchedLocations = locationsData || [];
				setLocations(fetchedLocations);

				// Pass locations to parent if callback provided
				if (onLocationsLoad) {
					onLocationsLoad(fetchedLocations);
				}
			} catch (error) {
				console.error("Error fetching locations:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchLocations();
	}, [tenant?.id, onLocationsLoad]);

	if (loading) {
		return (
			<DashboardHeaderSkeleton
				hasIncomePermission={hasIncomePermission}
				hasExpensePermission={hasExpensePermission}
			/>
		);
	}
	return (
		<div className="flex flex-col space-y-4">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl lg:text-2xl font-bold text-foreground">
						Welcome back!
					</h1>
					<p className="text-sm lg:text-base text-muted-foreground">
						Financial Management Dashboard
					</p>
				</div>
				<div className="flex flex-col sm:flex-row gap-2">
					{hasIncomePermission && (
						<Button
							asChild
							variant="default"
							size="sm"
							className="w-full sm:w-auto"
						>
							<Link to="/reservations">
								<Plus className="size-4" />
								Add Income
							</Link>
						</Button>
					)}
					{hasExpensePermission && (
						<Button
							asChild
							variant="outline"
							size="sm"
							className="w-full sm:w-auto"
						>
							<Link to="/expense">
								<Plus className="size-4" />
								Add Expense
							</Link>
						</Button>
					)}
				</div>
			</div>

			{/* Filters Row */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{/* Location selector removed - now handled by sidebar */}
				<div className="space-y-1">
					<Label className="text-xs">Month Filter</Label>
					<Input
						type="month"
						value={selectedMonth}
						onChange={(e) => setSelectedMonth(e.target.value)}
						className="h-9"
					/>
				</div>
			</div>
		</div>
	);
}
