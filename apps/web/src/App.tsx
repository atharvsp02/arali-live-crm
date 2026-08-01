import { Navigate, Route, Routes } from "react-router-dom";
import { RouteGuard } from "./router/RouteGuard";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { AdminPage } from "./pages/AdminPage";
import { UserDashboardPage } from "./pages/UserDashboardPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/demo" element={<Navigate to="/login" replace />} />
      <Route
        path="/admin"
        element={
          <RouteGuard role="ADMIN">
            <AdminPage />
          </RouteGuard>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RouteGuard role="USER">
            <UserDashboardPage />
          </RouteGuard>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
