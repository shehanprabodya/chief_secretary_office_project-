import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/authService';

type InvitationInfo = {
  id: number;
  expires_at: string;
  locale: 'en' | 'si';
  user: {
    full_name: string;
    email: string;
    username: string;
    role: string | null;
    organization: string | null;
  };
};

export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const invitationId = useMemo(() => Number(params.get('invitation') ?? '0'), [params]);
  const token = useMemo(() => params.get('token') ?? '', [params]);

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!invitationId || !token) {
        setError('Invitation link is invalid.');
        setLoading(false);
        return;
      }

      try {
        const data = await authService.validateInvitation(invitationId, token);
        setInvitation(data.invitation);
      } catch {
        setError('Invitation is invalid or expired.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [invitationId, token]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);

    if (password !== passwordConfirmation) {
      setError('Password confirmation does not match.');
      return;
    }

    if (!invitation) {
      setError('Invitation is not available.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.acceptInvitation({
        invitationId: invitation.id,
        token,
        password,
        password_confirmation: passwordConfirmation,
        locale: invitation.locale,
      });
      setStatus('Invitation accepted. You can sign in now.');
    } catch {
      setError('Unable to accept invitation. The link may be expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Accept Account Invitation</h1>

        {loading && <p className="mt-4 text-sm text-slate-600">Validating invitation...</p>}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {invitation && (
          <>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p><strong>Name:</strong> {invitation.user.full_name}</p>
              <p><strong>Username:</strong> {invitation.user.username}</p>
              <p><strong>Email:</strong> {invitation.user.email}</p>
              <p><strong>Role:</strong> {invitation.user.role ?? '-'}</p>
              <p><strong>Organization:</strong> {invitation.user.organization ?? '-'}</p>
            </div>

            <form className="mt-5 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">New password</label>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm password</label>
                <input type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
              </div>

              {status && <p className="text-sm text-green-700">{status}</p>}

              <button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {submitting ? 'Submitting...' : 'Set password'}
              </button>
            </form>
          </>
        )}

        <Link to="/" className="mt-5 inline-block text-sm text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
