import { useAuth } from '../../context/AuthContext';

export default function WelcomeSection() {
  const { user } = useAuth();

  return (
    <div className="rounded-lg bg-white p-6 dark:bg-slate-800 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Welcome back, {user?.full_name}
      </h1>
      
      
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        You have 4 meetings scheduled for today.
      </p>
    </div>
  );
}
