import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">403 — Access Denied</h1>
      <p className="text-slate-600">You don't have permission to view this page.</p>
      <Link to="/" className="text-blue-600 hover:underline">
        Return to Home
      </Link>
    </div>
  );
}