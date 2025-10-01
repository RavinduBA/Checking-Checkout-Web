import { Navigate } from "react-router";
import { useAuth } from "@/context/AuthContext";

export const AuthRedirect = () => {
	const { user, profile, loading } = useAuth();

	if (loading) {
		return null;
	}

	// If user is authenticated
	if (user) {
		// If profile doesn't have a tenant_id, redirect to onboarding
		if (!profile?.tenant_id) {
			return <Navigate to="/onboarding" replace />;
		}
		// If user has completed onboarding, redirect to smart redirect
		return <Navigate to="/smart-redirect" replace />;
	}

	// If user is not authenticated, redirect to auth page
	return <Navigate to="/auth" replace />;
};
