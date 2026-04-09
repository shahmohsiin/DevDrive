import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/Login";
import { SetupPage } from "./pages/Setup";
import { DashboardPage } from "./pages/Dashboard";
import { AdminUsersPage } from "./pages/AdminUsers";
import { AdminSettingsPage } from "./pages/AdminSettings";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
