import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Icon } from './Icon';
import { ASK_THREADS_KEY, parseThreads, threadTitle, type AskThread } from '../data/askThreads';
import './AskIslington.css';

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ask-islington`;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUGGESTIONS = ['Which courts can I use for free?', 'Where can I play indoors in winter?', 'What landmarks are near Highbury Fields?', 'How do I find a doubles partner?'];

function loadThreads(): AskThread[] { try { return parseThreads(localStorage.getItem(ASK_THREADS_KEY)); } catch { return []; } }
function saveThreads(threads: AskThread[]) { try { localStorage.setItem(ASK_THREADS_KEY, JSON.stringify(threads)); } catch { /* storage full or blocked */ } }
const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Plain paragraphs with clickable links; strips list markers and bold. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []; const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+[^\s).,;:])/g; let last = 0, m: RegExpExecArray | null;
  const clean = text.replace(/\*\*|__/g, '');
  while ((m = re.exec(clean))) { if (m.index > last) out.push(clean.slice(last, m.index)); const url = m[2] ?? m[3]; out.push(<a key={m.index} href={url} target="_blank" rel="noreferrer">{m[1] ?? url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>); last = m.index + m[0].length; }
  if (last < clean.length) out.push(clean.slice(last)); return out;
}
function Markdown({ text }: { text: string }) {
  return <>{text.split(/\n+/).map(l => l.replace(/^\s*(?:[-*•]|\d+[.)]|#+)\s+/, '').trim()).filter(Boolean).map((l, i) => <p key={i}>{inline(l)}</p>)}</>;
}

function Conversation({ thread, onSave }: { thread: AskThread; onSave: (id: string, messages: UIMessage[]) => void }) {
  const [input, setInput] = useState(''); const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null); const end = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop } = useChat({
    id: thread.id, messages: thread.messages as UIMessage[],
    transport: new DefaultChatTransport({ api: ENDPOINT, headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, body: { threadId: thread.id } }),
    onError: e => { let msg = 'The guide couldn’t answer just now. Please try again.'; try { msg = JSON.parse(e.message).error ?? msg; } catch { if (/fetch|network/i.test(e.message)) msg = 'You seem to be offline. Check your connection and try again.'; } setError(msg); },
  });
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => { if (status === 'ready' || status === 'error') onSave(thread.id, messages); }, [status, messages, thread.id, onSave]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages, status]);
  useEffect(() => { if (!busy) box.current?.focus({ preventScroll: true }); }, [busy]);
  function send(text: string) { const t = text.trim(); if (!t || busy) return; setError(null); setInput(''); sendMessage({ text: t }); }
  return <div className="ask-conversation">
    <div className="ask-transcript" aria-live="polite">
      {messages.length === 0 && <div className="ask-welcome"><Icon name="ball" size={28} /><h3>Ask about Islington’s courts</h3><p>Answers come only from the courts, landmarks and transport shown on this map.</p><div className="ask-suggestions">{SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div></div>}
      {messages.map(m => <div key={m.id} className={`ask-message ${m.role}`}>{m.parts.map((p, i) => p.type === 'text' ? (m.role === 'user' ? <p key={i}>{p.text}</p> : <Markdown key={i} text={p.text} />) : null)}</div>)}
      {status === 'submitted' && <div className="ask-message assistant ask-typing" aria-label="The guide is thinking"><span /><span /><span /></div>}
      {error && <p className="ask-error" role="alert">{error}</p>}
      <div ref={end} />
    </div>
    <form className="ask-composer" onSubmit={e => { e.preventDefault(); send(input); }}>
      <textarea ref={box} value={input} rows={2} maxLength={600} placeholder="Ask about a court, park or landmark…" aria-label="Your question" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }} />
      <div className="ask-composer-foot"><span/>{busy ? <button type="button" className="ask-send" onClick={() => stop()} aria-label="Stop answer"><Icon name="pause" size={14} /></button> : <button type="submit" className="ask-send" disabled={!input.trim()} aria-label="Send question"><Icon name="plus" size={14} /></button>}</div>
    </form>
  </div>;
}

export function AskIslington({ threadId, onNavigate, onClose }: { threadId: string | null; onNavigate: (id: string) => void; onClose: () => void }) {
  const [threads, setThreads] = useState<AskThread[]>(loadThreads);
  const update = (fn: (t: AskThread[]) => AskThread[]) => setThreads(prev => { const next = fn(prev); saveThreads(next); return next; });
  // Opening without a thread: reuse the newest empty one or create one, then go to its link.
  useEffect(() => {
    if (threadId && threads.some(t => t.id === threadId)) return;
    if (threadId) { const t = { id: threadId, title: 'New question', updatedAt: Date.now(), messages: [] }; update(prev => prev.some(p => p.id === threadId) ? prev : [t, ...prev]); return; }
    const empty = threads.find(t => t.messages.length === 0);
    onNavigate(empty?.id ?? newId());
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps
  const onSave = useCallback((id: string, messages: UIMessage[]) => {
    if (!messages.length) return;
    update(prev => prev.map(t => { if (t.id !== id) return t; if (JSON.stringify(t.messages) === JSON.stringify(messages)) return t; const first = messages.find(m => m.role === 'user')?.parts.find(p => p.type === 'text'); return { ...t, messages, updatedAt: Date.now(), title: first && 'text' in first ? threadTitle(first.text) : t.title }; }).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);
  function remove(id: string) { update(prev => prev.filter(t => t.id !== id)); if (id === threadId) { const other = threads.find(t => t.id !== id); onNavigate(other?.id ?? newId()); } }
  const active = threads.find(t => t.id === threadId);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [onClose]);
  return <div className="ask-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="ask-dialog" role="dialog" aria-modal="true" aria-label="Ask the Islington guide">
      <aside className="ask-threads" aria-label="Your conversations">
        <button className="ask-new" onClick={() => onNavigate(threads.find(t => t.messages.length === 0)?.id ?? newId())}><Icon name="plus" size={14} /> New conversation</button>
        <ul>{threads.filter(t => t.messages.length || t.id === threadId).map(t => <li key={t.id} className={t.id === threadId ? 'active' : ''}>
          <button className="ask-thread-open" aria-current={t.id === threadId ? 'page' : undefined} onClick={() => onNavigate(t.id)}>{t.title}</button>
          {t.messages.length > 0 && <button className="ask-thread-delete" aria-label={`Delete “${t.title}”`} onClick={() => remove(t.id)}>×</button>}
        </li>)}</ul>
        <p className="ask-threads-note">Saved in this browser only.</p>
      </aside>
      <div className="ask-main">
        <header className="ask-header"><div><h2>Ask the guide</h2><p>Courts, coaching, landmarks &amp; getting there</p></div><button className="ask-close" onClick={onClose} aria-label="Close guide">×</button></header>
        {active ? <Conversation key={active.id} thread={active} onSave={onSave} /> : <div className="ask-conversation" />}
      </div>
    </section>
  </div>;
}
