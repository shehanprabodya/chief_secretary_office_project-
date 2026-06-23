import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DeptHeadDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Department Head Dashboard</h1>
        <button onClick={handleLogout} className="text-sm text-red-600 hover:underline">
          Logout
        </button>
      </div>
      <p className="text-slate-600">Welcome, {user?.full_name} — {user?.department}</p>
    </div>
  );
}