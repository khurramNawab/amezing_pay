import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { fetchAdminMe, logout } from "@/features/auth/authSlice";

export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const { token, user } = useAppSelector((s) => s.auth);
  const location = useLocation();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchAdminMe()).unwrap().catch(() => dispatch(logout()));
    }
  }, [token, user, dispatch]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
