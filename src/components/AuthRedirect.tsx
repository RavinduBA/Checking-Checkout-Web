import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { FullScreenLoader } from "@/components/ui/loading-spinner";

export const AuthRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FullScreenLoader />;
  }

  // If user is authenticated, redirect to smart redirect to find appropriate page
  if (user) {
    return <Navigate to="/smart-redirect" replace />;
  }

  // If user is not authenticated, redirect to auth page
  return <Navigate to="/auth" replace />;
};
