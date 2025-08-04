import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const adminSession = localStorage.getItem("adminSession");

  if (!adminSession) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
