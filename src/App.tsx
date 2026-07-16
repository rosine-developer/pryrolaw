import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout, type View } from './components/layout/AppLayout';
import { AuthPage } from './pages/auth/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { CasesList } from './pages/cases/CasesList';
import { CaseDetail } from './pages/cases/CaseDetail';
import { Clients } from './pages/Clients';
import { Documents } from './pages/Documents';
import { Calendar } from './pages/Calendar';
import { Tasks } from './pages/Tasks';
import { AIWorkspace } from './pages/AIWorkspace';
import { Spinner } from './components/ui/EmptyState';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

function Workspace() {
  const [view, setView] = useState<View>('dashboard');
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [aiConversationId, setAiConversationId] = useState<string | null>(null);
  const [aiCaseId, setAiCaseId] = useState<string | null>(null);

  // Listen for AI workspace navigation events from child components
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setAiConversationId(id);
      setView('ai');
    };
    const onBack = () => setAiConversationId(null);
    window.addEventListener('ai-conversation-open', onOpen);
    window.addEventListener('ai-conversation-back', onBack);
    return () => {
      window.removeEventListener('ai-conversation-open', onOpen);
      window.removeEventListener('ai-conversation-back', onBack);
    };
  }, []);

  const navigate = (v: View) => {
    setView(v);
    setOpenCaseId(null);
    if (v !== 'ai') setAiConversationId(null);
  };

  const openCase = (id: string) => {
    setOpenCaseId(id);
    setView('cases');
  };

  const openAIConversation = (conversationId: string, linkedCaseId: string) => {
    setAiConversationId(conversationId);
    setAiCaseId(linkedCaseId);
    setView('ai');
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={navigate}
            onOpenCase={openCase}
            onOpenAI={() => { setAiConversationId(null); setAiCaseId(null); setView('ai'); }}
          />
        );
      case 'cases':
        return openCaseId ? (
          <CaseDetail
            caseId={openCaseId}
            onBack={() => setOpenCaseId(null)}
            onOpenAIConversation={openAIConversation}
          />
        ) : (
          <CasesList onOpenCase={openCase} />
        );
      case 'documents':
        return <Documents onOpenCase={openCase} />;
      case 'clients':
        return <Clients />;
      case 'calendar':
        return <Calendar onOpenCase={openCase} />;
      case 'tasks':
        return <Tasks onOpenCase={openCase} />;
      case 'ai':
        return (
          <AIWorkspace
            conversationId={aiConversationId}
            caseId={aiCaseId ?? openCaseId}
            onOpenCase={openCase}
          />
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout current={view} onNavigate={navigate}>
      <ErrorBoundary key={view}>
        {renderView()}
      </ErrorBoundary>
    </AppLayout>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!user) return <AuthPage />;
  return <Workspace />;
}

export default function AppRoot() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
