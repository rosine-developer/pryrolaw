import { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, LayoutDashboard, Briefcase, Users, FileText, CalendarDays, Sparkles, LogOut, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn, initials } from '../../lib/utils';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DebugPanel } from '../ui/DebugPanel';

export type View = 'dashboard' | 'cases' | 'clients' | 'documents' | 'calendar' | 'ai';

export interface NavItem {
  id: View;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'cases', label: 'Cases', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
];

function AiFloatingButton({ onNavigate }: { onNavigate: (v: View) => void }) {
  const defaultRight = import.meta.env.DEV ? 112 : 20;
  const defaultBottom = 20;
  const btnRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    didDrag.current = false;
    const rect = btnRef.current!.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !btnRef.current) return;
      didDrag.current = true;
      const x = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - btnRef.current.offsetWidth);
      const y = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - btnRef.current.offsetHeight);
      btnRef.current.style.left = `${x}px`;
      btnRef.current.style.top = `${y}px`;
      btnRef.current.style.right = 'auto';
      btnRef.current.style.bottom = 'auto';
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <button
      ref={btnRef}
      onMouseDown={onMouseDown}
      onClick={() => { if (!didDrag.current) onNavigate('ai'); }}
      style={{ bottom: defaultBottom, right: defaultRight }}
      className="fixed z-50 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-xs font-semibold border transition-all duration-200 group overflow-hidden cursor-grab active:cursor-grabbing select-none bg-primary-600 border-primary-700 text-white hover:bg-primary-700"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-200">
        AI Workspace
      </span>
    </button>
  );
}

export function AppLayout({
  current,
  onNavigate,
  children,
}: {
  current: View;
  onNavigate: (v: View) => void;
  children: React.ReactNode;
}) {
  const { user, profile, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayName = profile?.fullName ?? user?.email ?? 'Lawyer';

  const SidebarContent = (isMobile = false) => (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Logo */}
      <div className={cn('flex items-center h-16 shrink-0 px-3', expanded || isMobile ? 'gap-2.5' : 'justify-center')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
          <Scale className="h-4 w-4" />
        </div>
        {(expanded || isMobile) && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 leading-tight tracking-tight whitespace-nowrap">Legal Workspace</p>
            <p className="text-[11px] text-ink-500 leading-tight">Practice Management</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        {(expanded || isMobile) && (
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">Workspace</p>
        )}
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
              title={!expanded && !isMobile ? item.label : undefined}
              className={cn(
                'w-full flex items-center rounded-lg text-sm font-medium transition-colors',
                expanded || isMobile ? 'gap-3 px-2.5 py-2' : 'justify-center px-2 py-2.5',
                active ? 'bg-primary-50 text-primary-700' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', active ? 'text-primary-600' : 'text-ink-400')} />
              {(expanded || isMobile) && <span className="whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Profile — bottom of sidebar */}
      <div className={cn('shrink-0 px-2 pb-3 border-t border-ink-100 pt-2')}>
        <button
          onClick={() => { setMenuOpen(v => !v); }}
          title={!expanded && !isMobile ? displayName : undefined}
          className={cn(
            'w-full flex items-center rounded-lg text-sm font-medium transition-colors hover:bg-ink-100',
            expanded || isMobile ? 'gap-3 px-2.5 py-2' : 'justify-center px-2 py-2.5',
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
            {initials(displayName)}
          </div>
          {(expanded || isMobile) && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-ink-800 truncate">{displayName}</p>
              <p className="text-[11px] text-ink-400 truncate">{profile?.firmName ?? 'Independent practice'}</p>
            </div>
          )}
          {(expanded || isMobile) && <ChevronDown className="h-3.5 w-3.5 text-ink-400 shrink-0" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Desktop sidebar — collapsed by default, expands on hover */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          'hidden lg:flex fixed inset-y-0 left-0 border-r border-ink-200 bg-white z-20 transition-all duration-200',
          expanded ? 'w-60' : 'w-16',
        )}
      >
        {SidebarContent()}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white border-r border-ink-200 shadow-elevated">
            {SidebarContent(true)}
          </aside>
        </div>
      )}

      <div className={cn('transition-all duration-200', expanded ? 'lg:pl-60' : 'lg:pl-16')}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-md text-ink-500 hover:bg-ink-100"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600 text-white">
                <Scale className="h-4 w-4" />
              </div>
            </div>
            <h1 className="text-sm font-semibold text-ink-900 hidden sm:block">
              {NAV.find((n) => n.id === current)?.label ?? 'AI Workspace'}
            </h1>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto">{children}</main>
      </div>

      <ConfirmDialog
        open={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={signOut}
        title="Sign out"
        message="You will be returned to the sign-in screen."
        confirmLabel="Sign out"
      />

      {/* Profile dropdown — rendered outside sidebar to avoid overflow clipping */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className={cn(
            'fixed bottom-16 z-40 w-56 bg-white rounded-lg border border-ink-200 shadow-elevated py-1',
            expanded ? 'left-4' : 'left-4',
          )}>
            <div className="px-3 py-2 border-b border-ink-100">
              <p className="text-sm font-medium text-ink-900 truncate">{displayName}</p>
              <p className="text-xs text-ink-500 truncate">{profile?.firmName ?? 'Independent practice'}</p>
            </div>
            <button
              onClick={() => { setMenuOpen(false); setConfirmSignOut(true); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <LogOut className="h-4 w-4 text-ink-400" />
              Sign out
            </button>
          </div>
        </>
      )}

      {/* Debug panel — dev only */}
      {import.meta.env.DEV ? <DebugPanel /> : null}

      {/* AI Workspace floating draggable button */}
      <AiFloatingButton onNavigate={onNavigate} />
    </div>
  );
}
