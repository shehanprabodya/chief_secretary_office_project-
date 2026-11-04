import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const email = useMemo(() => params.get('email') ?? '', [params]);

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (password !== passwordConfirmation) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword({
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
        locale: i18n.language === 'si' ? 'si' : 'en',
      });
      setStatus('Password reset successful. You can sign in now.');
    } catch {
      setError('Reset token is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{t('auth.resetPassword')}</h1>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">{t('auth.email')}</label>
            <input value={email} disabled className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm" />
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

          <button type="submit" disabled={loading || token === '' || email === ''} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? 'Submitting...' : t('auth.submit')}
          </button>
        </form>

        <Link to="/" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  );
}
