import { useCallback, useEffect, useState } from "react";
import { SectionLoader } from "@/components/ui/loading-spinner";
import {
	AccountBalances,
	DashboardHeader,
	SummaryCards,
	UpcomingBookings,
} from "@/components/dashboard";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Income = Tables<"income"> & {
	accounts: Tables<"accounts">;
};

type Expense = Tables<"expenses"> & {
	accounts: Tables<"accounts">;
};

type Booking = Tables<"bookings"> & {
	locations: Tables<"locations">;
};

type Account = Tables<"accounts">;
type Location = Tables<"locations">;

export default function Dashboard() {
	const [loading, setLoading] = useState(true);
	const [todayIncome, setTodayIncome] = useState(0);
	const [todayExpenses, setTodayExpenses] = useState(0);
	const [weeklyIncome, setWeeklyIncome] = useState(0);
	const [weeklyExpenses, setWeeklyExpenses] = useState(0);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
	const [accountBalances, setAccountBalances] = useState<
		Record<string, number>
	>({});
	const [selectedLocation, setSelectedLocation] = useState("");
	const [selectedMonth, setSelectedMonth] = useState("");
	const [locations, setLocations] = useState<Location[]>([]);
	const { hasAnyPermission, hasPermission } = usePermissions();
	const { tenant } = useAuth();

	const calculateAccountBalances = useCallback(async (accountsList: Account[]) => {
		const balances: Record<string, number> = {};

		for (const account of accountsList) {
			let balance = account.initial_balance;

			// Add income
			const { data: income } = await supabase
				.from("income")
				.select("amount")
				.eq("account_id", account.id);

			// Subtract expenses
			const { data: expenses } = await supabase
				.from("expenses")
				.select("amount")
				.eq("account_id", account.id);

			// Add incoming transfers
			const { data: incomingTransfers } = await supabase
				.from("account_transfers")
				.select("amount, conversion_rate")
				.eq("to_account_id", account.id);

			// Subtract outgoing transfers
			const { data: outgoingTransfers } = await supabase
				.from("account_transfers")
				.select("amount")
				.eq("from_account_id", account.id);

			balance += (income || []).reduce((sum, item) => sum + item.amount, 0);
			balance -= (expenses || []).reduce((sum, item) => sum + item.amount, 0);
			balance += (incomingTransfers || []).reduce(
				(sum, item) => sum + item.amount * item.conversion_rate,
				0,
			);
			balance -= (outgoingTransfers || []).reduce(
				(sum, item) => sum + item.amount,
				0,
			);

			balances[account.id] = balance;
		}

		setAccountBalances(balances);
	}, []);

	// Auto-select first location when locations are loaded
	useEffect(() => {
		if (locations.length > 0 && !selectedLocation) {
			setSelectedLocation(locations[0].id);
		}
	}, [locations, selectedLocation]);

	useEffect(() => {
		const fetchDashboardData = async () => {
			if (!tenant?.id) {
				console.log("No tenant available, skipping dashboard data fetch");
				setLoading(false);
				return;
			}

			try {
				// Set date filters based on selected month
				const today = new Date().toISOString().split("T")[0];
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					.toISOString()
					.split("T")[0];

				let monthStart = "";
				let monthEnd = "";
				if (selectedMonth) {
					const [year, month] = selectedMonth.split("-");
					monthStart = `${year}-${month}-01`;
					const nextMonth = new Date(parseInt(year), parseInt(month), 1);
					monthEnd = nextMonth.toISOString().split("T")[0];
				}

				// Build query filters - always include tenant filter
				const locationFilter = !selectedLocation
					? {}
					: { location_id: selectedLocation };
				const todayFilter = selectedMonth
					? { ...locationFilter, date: { gte: monthStart, lt: monthEnd } }
					: { ...locationFilter, date: today };
				const weeklyFilter = selectedMonth
					? { ...locationFilter, date: { gte: monthStart, lt: monthEnd } }
					: { ...locationFilter, date: { gte: weekAgo } };

				// Get locations for the tenant first to filter by tenant
				const { data: tenantLocations } = await supabase
					.from("locations")
					.select("id")
					.eq("tenant_id", tenant.id)
					.eq("is_active", true);

				const tenantLocationIds = tenantLocations?.map((loc) => loc.id) || [];

				if (tenantLocationIds.length === 0) {
					// No locations for this tenant
					setTodayIncome(0);
					setTodayExpenses(0);
					setWeeklyIncome(0);
					setWeeklyExpenses(0);
					setAccounts([]);
					setUpcomingBookings([]);
					setLocations([]);
					setLoading(false);
					return;
				}

				const [
					todayIncomeData,
					todayExpensesData,
					weeklyIncomeData,
					weeklyExpensesData,
					accountsData,
					bookingsData,
					locationsData,
				] = await Promise.all([
					selectedMonth
						? supabase
								.from("income")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("income")
								.select("amount")
								.eq("date", today)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("expenses")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("expenses")
								.select("amount")
								.eq("date", today)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("income")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("income")
								.select("amount")
								.gte("date", weekAgo)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					selectedMonth
						? supabase
								.from("expenses")
								.select("amount")
								.gte("date", monthStart)
								.lt("date", monthEnd)
								.in("location_id", tenantLocationIds)
								.match(locationFilter)
						: supabase
								.from("expenses")
								.select("amount")
								.gte("date", weekAgo)
								.in("location_id", tenantLocationIds)
								.match(locationFilter),
					supabase.from("accounts").select("*"),
					supabase
						.from("bookings")
						.select("*, locations(*)")
						.in("location_id", tenantLocationIds)
						.match(!selectedLocation ? {} : { location_id: selectedLocation })
						.order("check_in")
						.limit(5),
					supabase
						.from("locations")
						.select("*")
						.eq("tenant_id", tenant.id)
						.eq("is_active", true),
				]);

				setTodayIncome(
					todayIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setTodayExpenses(
					todayExpensesData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setWeeklyIncome(
					weeklyIncomeData.data?.reduce((sum, item) => sum + item.amount, 0) ||
						0,
				);
				setWeeklyExpenses(
					weeklyExpensesData.data?.reduce(
						(sum, item) => sum + item.amount,
						0,
					) || 0,
				);

				// Filter accounts to only those that have access to tenant's locations
				const filteredAccounts = (accountsData.data || []).filter((account) =>
					account.location_access.some((locationId) =>
						tenantLocationIds.includes(locationId),
					),
				);
				setAccounts(filteredAccounts);

				setUpcomingBookings(bookingsData.data || []);
				setLocations(locationsData.data || []);

				// Calculate account balances
				await calculateAccountBalances(accountsData.data || []);
			} catch (error) {
				console.error("Error fetching dashboard data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, [selectedLocation, selectedMonth, tenant?.id, calculateAccountBalances]);

	if (loading) {
		return <SectionLoader className="min-h-64" />;
	}

	return (
		<div className="space-y-4 w-full pb-8 lg:space-y-6 animate-fade-in p-4">
			{/* Header with Filters */}
			<DashboardHeader
				selectedLocation={selectedLocation}
				setSelectedLocation={setSelectedLocation}
				selectedMonth={selectedMonth}
				setSelectedMonth={setSelectedMonth}
				locations={locations}
				hasIncomePermission={hasAnyPermission(["access_income"])}
				hasExpensePermission={hasAnyPermission(["access_expenses"])}
			/>

			{/* Summary Cards */}
			<SummaryCards
				todayIncome={todayIncome}
				todayExpenses={todayExpenses}
				weeklyIncome={weeklyIncome}
				weeklyExpenses={weeklyExpenses}
				selectedLocation={selectedLocation}
				selectedMonth={selectedMonth}
				locations={locations}
			/>

			{/* Account Balances */}
			<AccountBalances
				accounts={accounts}
				accountBalances={accountBalances}
			/>

			{/* Upcoming Bookings */}
			<UpcomingBookings
				upcomingBookings={upcomingBookings}
				hasCalendarPermission={hasAnyPermission(["access_calendar"])}
			/>
		</div>
	);
}
