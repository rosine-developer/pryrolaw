import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, profileApi, type ApiUser, type ApiProfile } from '../lib/api';

interface AuthContextValue {
  user: ApiUser | null;
  profile: ApiProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [profile, setProfile] = useState<ApiProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const p = await profileApi.get();
      setProfile(p);
    } catch {
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  // On mount — restore session from stored token
  useEffect(() => {
    if (!authApi.isAuthenticated()) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then((u) => {
        setUser(u);
        setProfile(u.profile);
      })
      .catch(() => {
        authApi.clearTokens();
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setProfile(data.user.profile);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    try {
      const data = await authApi.register(email, password, fullName);
      setUser(data.user);
      setProfile(data.user.profile);
      return { error: null };
    } catch (e) {
      return { error: (e as Error).message };
    }
  };

  const signOut = async () => {
    await authApi.logout();
    setUser(null);
    setProfile(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
