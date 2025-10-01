import { Plus } from "lucide-react";
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
import { Tables } from "@/integrations/supabase/types";

type Location = Tables<"locations">;

interface DashboardHeaderProps {
	selectedLocation: string;
	setSelectedLocation: (value: string) => void;
	selectedMonth: string;
	setSelectedMonth: (value: string) => void;
	locations: Location[];
	hasIncomePermission: boolean;
	hasExpensePermission: boolean;
}

export function DashboardHeader({
	selectedLocation,
	setSelectedLocation,
	selectedMonth,
	setSelectedMonth,
	locations,
	hasIncomePermission,
	hasExpensePermission,
}: DashboardHeaderProps) {
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
				<div className="space-y-1">
					<Label className="text-xs">Location Filter</Label>
					<Select
						value={selectedLocation}
						onValueChange={setSelectedLocation}
					>
						<SelectTrigger className="h-9">
							<SelectValue
								placeholder={
									locations.find((l) => l.id === selectedLocation)?.name ||
									"Select Location"
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{locations.map((location) => (
								<SelectItem key={location.id} value={location.id}>
									{location.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
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