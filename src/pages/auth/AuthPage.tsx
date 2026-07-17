import { useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Scale, AlertCircle, Eye, EyeOff } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex w-full max-w-5xl mx-auto px-6">
        {/* Left brand panel */}
        <div className="hidden lg:flex w-1/2 flex-col justify-center pr-16">
          <div className="space-y-8 max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-ink-900">Legal Workspace</span>
            </div>
            <div className="space-y-5">
              <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink-900">
                Your legal practice, organized.
              </h1>
              <ul className="space-y-2.5 text-sm text-ink-600">
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                  Cases, documents, and deadlines in one place
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                  Secure and encrypted — row-level access control
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-500 shrink-0" />
                  AI assistance, on your terms
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex-1 flex items-center justify-start py-12">
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
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-[34px] text-ink-400 hover:text-ink-600 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

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
      </div>

      {/* Footer */}
      <footer className="py-4">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center justify-center gap-1 text-xs text-ink-400">
          <span>Encrypted at rest. Row-level security on every record.</span>
          <span>© {new Date().getFullYear()} Legal Workspace. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
