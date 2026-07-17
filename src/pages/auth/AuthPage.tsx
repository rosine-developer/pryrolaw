import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Scale, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result =
      mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, fullName.trim() || email.split('@')[0]);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-ink-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Legal Workspace</span>
        </div>
        <div className="relative space-y-6 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Professional practice management for lawyers worldwide.
          </h1>
          <p className="text-ink-300 leading-relaxed">
            Manage cases, documents, deadlines, and tasks in one secure, professional workspace.
            You stay in control. AI is available when you choose to use it.
          </p>
          <ul className="space-y-3 text-sm text-ink-200">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
              Centralized case management with timelines and notes
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
              Secure document workspace with version tracking
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
              Optional AI assistance — always lawyer-directed
            </li>
          </ul>
        </div>
        <div className="relative text-xs text-ink-400">
          Encrypted at rest. Row-level security on every record.
        </div>
      </div>

      {/* Right form panel — white */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-ink-900">Legal Workspace</span>
          </div>

          <h2 className="text-xl font-semibold text-ink-900">
            {mode === 'signin' ? 'Sign in to your workspace' : 'Create your account'}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            {mode === 'signin'
              ? 'Enter your credentials to access your practice.'
              : 'Start managing your legal practice in minutes.'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Input
                label="Full name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="name"
              />
            )}
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-ink-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
