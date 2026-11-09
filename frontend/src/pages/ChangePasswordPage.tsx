import { useState } from 'react';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { authService } from '../services/authService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setError(null);

    if (password !== passwordConfirmation) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
        logout_other_devices: true,
      });
      setStatus('Password changed successfully.');
      setCurrentPassword('');
      setPassword('');
      setPasswordConfirmation('');
      if (user?.must_change_password) window.location.assign('/');
    } catch {
      setError('Unable to change password. Please verify your current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle={t('auth.changePassword')}>
      <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{t('auth.changePassword')}</h1>
        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('auth.currentPassword')}</label>
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('auth.newPassword')}</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('auth.confirmPassword')}</label>
            <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
          </div>

          {status && <p className="text-sm text-green-700">{status}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}

          <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Saving...' : t('auth.submit')}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
