import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../utils/hooks/useAuth";
import Loading from "../pages/Loading";

export default function ProtectedLayout() {
  const { auth, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;

  // Redirect if NOT authenticated
  if (!auth?.isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
    
  return <Outlet />;
}
