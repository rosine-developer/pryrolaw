import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { AlertCircle } from 'lucide-react';
import { authApi } from '../../lib/api';

export function ResetPasswordModal({ open, onClose, token }: { open: boolean; onClose: () => void; token?: string | null }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (token) {
      setEmail('');
      setSuccess(null);
      setError(null);
    }
  }, [token, open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (token) {
        if (newPassword.length < 8) throw new Error('Password must be at least 8 characters.');
        await authApi.resetPassword(token, newPassword);
        setSuccess('Password reset successfully. You can now sign in with your new password.');
      } else {
        await authApi.forgotPassword(email.trim());
        setSuccess('If an account exists, a reset link has been sent to that email.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset your password" description="Enter your account email to receive a password reset link." size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        {!token ? (
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@firm.com"
            autoComplete="email"
          />
        ) : (
          <Input
            label="New password"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">{success}</div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Send reset link</Button>
        </div>
      </form>
    </Modal>
  );
}

export default ResetPasswordModal;
