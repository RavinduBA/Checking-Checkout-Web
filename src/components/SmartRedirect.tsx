import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "@/components/ui/loading-spinner";

export const SmartRedirect = () => {
  const { hasAnyPermission, loading, isAdmin } = usePermissions();

  if (loading) {
    return <FullScreenLoader />;
  }

  // Admins always get dashboard access
  if (isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Redirect to the first page the user has access to
  if (hasAnyPermission("dashboard")) {
    return <Navigate to="/dashboard" replace />;
  } else if (hasAnyPermission("calendar")) {
    return <Navigate to="/calendar" replace />;
  } else if (hasAnyPermission("bookings")) {
    return <Navigate to="/reservations" replace />;
  } else if (hasAnyPermission("income")) {
    return <Navigate to="/income" replace />;
  } else if (hasAnyPermission("expenses")) {
    return <Navigate to="/expense" replace />;
  } else if (hasAnyPermission("reports")) {
    return <Navigate to="/reports" replace />;
  } else if (hasAnyPermission("accounts")) {
    return <Navigate to="/accounts" replace />;
  } else if (hasAnyPermission("master_files")) {
    return <Navigate to="/master-files" replace />;
  } else if (hasAnyPermission("booking_channels")) {
    return <Navigate to="/booking-channels" replace />;
  } else if (hasAnyPermission("rooms")) {
    return <Navigate to="/rooms" replace />;
  } else if (hasAnyPermission("users")) {
    return <Navigate to="/users" replace />;
  } else if (hasAnyPermission("settings")) {
    return <Navigate to="/settings" replace />;
  } else {
    // User has no permissions - show access denied
    return <Navigate to="/access-denied" replace />;
  }
};