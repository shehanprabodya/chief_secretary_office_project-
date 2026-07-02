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
import MeetingsPage from './pages/MeetingsPage';
import GenerateLetterPage from './pages/GenerateLetterPage';
import AttendancePage from './pages/AttendancePage';
import ApprovalsPage from './pages/ApprovalsPage';
import CreateMinutesPage from './pages/CreateMinutesPage';

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
          
          <Route element={<ProtectedRoute allowedRoles={['officer', 'admin']} />}>
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/letters/new" element={<GenerateLetterPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/minutes" element={<CreateMinutesPage />} />
            
          
          </Route>
          // Approvals visible to ALL roles that participate in workflow
          <Route element={<ProtectedRoute allowedRoles={['admin', 'officer', 'dept_head', 'deputy', 'chief_secretary']} />}>
            <Route path="/approvals" element={<ApprovalsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

