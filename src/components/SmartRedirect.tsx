import { Navigate } from "react-router";
import { FullScreenLoader } from "@/components/ui/loading-spinner";
import { useLocationContext } from "@/context/LocationContext";
import { usePermissions } from "@/hooks/usePermissions";

export const SmartRedirect = () => {
	const { hasAnyPermission, loading } = usePermissions();
	const { locations, loading: locationsLoading } = useLocationContext();

	if (loading || locationsLoading) {
		return <FullScreenLoader />;
	}

	// If user has no locations, redirect to onboarding to set up their first location
	if (locations.length === 0) {
		return <Navigate to="/onboarding" replace />;
	}

	// Redirect to the first page the user has access to
	if (hasAnyPermission(["access_dashboard"])) {
		return <Navigate to="/dashboard" replace />;
	} else if (hasAnyPermission(["access_calendar"])) {
		return <Navigate to="/calendar" replace />;
	} else if (hasAnyPermission(["access_bookings"])) {
		return <Navigate to="/reservations" replace />;
	} else if (hasAnyPermission(["access_income"])) {
		return <Navigate to="/income" replace />;
	} else if (hasAnyPermission(["access_expenses"])) {
		return <Navigate to="/expense" replace />;
	} else if (hasAnyPermission(["access_reports"])) {
		return <Navigate to="/reports" replace />;
	} else if (hasAnyPermission(["access_accounts"])) {
		return <Navigate to="/accounts" replace />;
	} else if (hasAnyPermission(["access_master_files"])) {
		return <Navigate to="/master-files" replace />;
	} else if (hasAnyPermission(["access_booking_channels"])) {
		return <Navigate to="/booking-channels" replace />;
	} else if (hasAnyPermission(["access_rooms"])) {
		return <Navigate to="/rooms" replace />;
	} else if (hasAnyPermission(["access_users"])) {
		return <Navigate to="/users" replace />;
	} else if (hasAnyPermission(["access_settings"])) {
		return <Navigate to="/settings" replace />;
	} else {
		// User has no permissions - show access denied
		return <Navigate to="/access-denied" replace />;
	}
};
