import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminDashboard from './pages/AdminDashboard';
import OfficerDashboard from './pages/OfficerDashbord';
import DeptHeadDashboard from './pages/DeptHeadDashboard';
import DeputyDashboard from './pages/DeputyDashboard';
import ChiefSecretaryDashboard from './pages/ChiefSecretaryDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/dashboard/admin" element={<AdminDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['officer']} />}>
            <Route path="/dashboard/officer" element={<OfficerDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['dept_head']} />}>
            <Route path="/dashboard/dept-head" element={<DeptHeadDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['deputy']} />}>
            <Route path="/dashboard/deputy" element={<DeputyDashboard />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['chief_secretary']} />}>
            <Route path="/dashboard/chief-secretary" element={<ChiefSecretaryDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

