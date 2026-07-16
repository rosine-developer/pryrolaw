import { useState, useEffect, useRef } from 'react';
import { Plus, Send, Trash2, Sparkles, Bot, User, ChevronLeft, AlertCircle } from 'lucide-react';
import { aiApi, casesApi, type ApiConversation, type ApiAIMessage, type ApiCase } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { cn } from '../lib/utils';
import { AI_PROMPT_TEMPLATES } from '../lib/ai-service';

interface Props {
  conversationId: string | null;
  caseId: string | null;
  onOpenCase: (id: string) => void;
}

export function AIWorkspace({ conversationId: initConvId, caseId: initCaseId, onOpenCase }: Props) {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ApiAIMessage[]>([]);
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState('');
  const [deletingConv, setDeletingConv] = useState<ApiConversation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load sidebar data
  useEffect(() => {
    Promise.all([
      aiApi.listConversations(),
      casesApi.list({ limit: '100' }).then((r) => r.cases ?? []),
    ]).then(([convs, c]) => {
      setConversations(convs);
      setCases(c);

      // If we were navigated here with a specific conversation
      if (initConvId && initConvId !== 'new') {
        const found = convs.find((cv) => cv.id === initConvId);
        if (found) openConversation(found);
      } else if (initConvId === 'new' && initCaseId) {
        handleNewConversation(initCaseId, c);
      } else if (convs.length > 0 && !activeConv) {
        openConversation(convs[0]);
      }
    }).catch(() => {}).finally(() => setLoadingConvs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv: ApiConversation) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    setError('');
    try {
      const full = await aiApi.getConversation(conv.id);
      setMessages(full.messages ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const handleNewConversation = async (caseId?: string, caseList?: ApiCase[]) => {
    const cList = caseList ?? cases;
    const linkedCase = caseId ? cList.find((c) => c.id === caseId) : undefined;
    const title = linkedCase ? `${linkedCase.title} — AI` : `New conversation`;
    try {
      const conv = await aiApi.createConversation({ title, caseId });
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(conv);
      setMessages([]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDeleteConversation = async () => {
    if (!deletingConv) return;
    await aiApi.deleteConversation(deletingConv.id);
    setConversations((prev) => prev.filter((c) => c.id !== deletingConv.id));
    if (activeConv?.id === deletingConv.id) {
      setActiveConv(null);
      setMessages([]);
    }
    setDeletingConv(null);
  };

  const handleSend = async (content?: string) => {
    const text = (content ?? input).trim();
    if (!text || !activeConv || sending) return;
    setInput('');
    setSending(true);
    setError('');

    // Optimistic user message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ApiAIMessage = {
      id: tempId,
      conversationId: activeConv.id,
      userId: '',
      role: 'USER',
      content: text,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const result = await aiApi.sendMessage(activeConv.id, text);
      // Replace temp user msg + add assistant response
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        const userMsg: ApiAIMessage = { ...tempMsg, id: `u-${Date.now()}` };
        return [...without, userMsg, result.message];
      });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] border border-ink-200 rounded-xl overflow-hidden bg-white">
      {/* Sidebar */}
      <div className={cn(
        'flex flex-col border-r border-ink-200 bg-ink-50/50 transition-all duration-200',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden',
      )}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-ink-200">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Conversations</p>
          <button
            onClick={() => handleNewConversation()}
            className="p-1 rounded hover:bg-ink-200 transition-colors text-ink-500"
            title="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loadingConvs ? (
            <div className="flex justify-center py-6"><Spinner className="h-4 w-4" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-ink-400 text-center py-6 px-3">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group flex items-center justify-between px-3 py-2 mx-1 rounded-lg cursor-pointer transition-colors',
                  activeConv?.id === conv.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-ink-100 text-ink-600',
                )}
                onClick={() => openConversation(conv)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  {conv.case && <p className="text-[10px] text-ink-400 truncate">{conv.case.title}</p>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletingConv(conv); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ink-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Case selector for new conv */}
        {cases.length > 0 && (
          <div className="px-3 py-3 border-t border-ink-200">
            <p className="text-[10px] uppercase tracking-wider text-ink-400 mb-1.5">Start with case context</p>
            <select
              className="w-full h-8 px-2 text-xs border border-ink-300 rounded-lg bg-white text-ink-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
              defaultValue=""
              onChange={(e) => { if (e.target.value) handleNewConversation(e.target.value); e.target.value = ''; }}
            >
              <option value="" disabled>Select a case…</option>
              {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Main chat */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink-200 shrink-0">
          <button onClick={() => setSidebarOpen((v) => !v)} className="p-1 rounded hover:bg-ink-100 transition-colors text-ink-400">
            <ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100">
            <Sparkles className="h-3.5 w-3.5 text-primary-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-800 truncate">
              {activeConv ? activeConv.title : 'AI Workspace'}
            </p>
            {activeConv?.case && (
              <button onClick={() => onOpenCase(activeConv.case!.id)} className="text-xs text-primary-600 hover:underline truncate">
                {activeConv.case.title}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeConv && !loadingConvs && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                <Sparkles className="h-7 w-7 text-primary-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-ink-800">AI Workspace</p>
                <p className="text-sm text-ink-500 mt-1 max-w-xs">
                  Start a new conversation or select one from the sidebar.
                  The lawyer is always in control.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleNewConversation()}>
                <Plus className="h-3.5 w-3.5" /> New conversation
              </Button>
              {/* Prompt templates */}
              <div className="w-full max-w-md space-y-3 text-left mt-4">
                {AI_PROMPT_TEMPLATES.map((cat) => (
                  <div key={cat.category}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1.5">{cat.category}</p>
                    <div className="space-y-1">
                      {cat.prompts.map((p) => (
                        <button
                          key={p}
                          disabled={!activeConv}
                          onClick={() => handleSend(p)}
                          className="w-full text-left text-xs text-ink-600 px-3 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 hover:border-primary-300 transition-colors disabled:opacity-40"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingMsgs && (
            <div className="flex justify-center py-8"><Spinner className="h-5 w-5" /></div>
          )}

          {activeConv && !loadingMsgs && messages.length === 0 && (
            <div className="space-y-4">
              <p className="text-xs text-ink-400 text-center">Start by asking a question or choosing a template:</p>
              {AI_PROMPT_TEMPLATES.map((cat) => (
                <div key={cat.category}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-400 mb-1.5">{cat.category}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {cat.prompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleSend(p)}
                        className="text-left text-xs text-ink-600 px-3 py-2 rounded-lg border border-ink-200 hover:bg-ink-50 hover:border-primary-300 transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {sending && (
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-100">
                <Bot className="h-3.5 w-3.5 text-ink-500" />
              </div>
              <div className="bg-ink-50 border border-ink-200 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {activeConv && (
          <div className="px-4 py-3 border-t border-ink-200 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask anything about this case… (Enter to send, Shift+Enter for newline)"
                rows={2}
                disabled={sending}
                className="flex-1 px-3 py-2 text-sm border border-ink-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none disabled:opacity-50"
              />
              <Button onClick={() => handleSend()} disabled={!input.trim() || sending} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-ink-400 mt-1.5 text-center">
              AI assists — you decide. Always review before acting on AI output.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deletingConv}
        onClose={() => setDeletingConv(null)}
        onConfirm={handleDeleteConversation}
        title="Delete conversation"
        message={`Delete "${deletingConv?.title}"? All messages will be lost.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}

function MessageBubble({ message }: { message: ApiAIMessage }) {
  const isUser = message.role === 'USER';
  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary-100' : 'bg-ink-100',
      )}>
        {isUser ? <User className="h-3.5 w-3.5 text-primary-600" /> : <Bot className="h-3.5 w-3.5 text-ink-500" />}
      </div>
      <div className={cn(
        'max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed',
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-ink-50 border border-ink-200 text-ink-800 rounded-tl-sm',
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
