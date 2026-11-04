import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setLoading(true);

    try {
      await authService.forgotPassword(email, i18n.language === 'si' ? 'si' : 'en');
      setStatus('If your email is registered, a reset link has been sent.');
    } catch {
      setError('Unable to process your request right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{t('auth.requestReset')}</h1>

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          {status && <p className="text-sm text-green-700">{status}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
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
