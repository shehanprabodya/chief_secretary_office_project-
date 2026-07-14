import { useAuth } from '../../context/AuthContext';

export default function WelcomeSection() {
  const { user } = useAuth();

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/40">
      <h1 className="text-2xl font-bold text-blue-950 dark:text-blue-100">
        Welcome back, {user?.full_name}
      </h1>
      
      
      <p className="mt-1 text-blue-700 dark:text-blue-300">
        You have 4 meetings scheduled for today.
      </p>
    </div>
  );
}
