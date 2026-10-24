import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Icon } from './Icon';
import { ASK_THREADS_KEY, parseThreads, threadTitle, type AskThread } from '../data/askThreads';
import { boundGuideWindow, initialGuideWindow, type GuideWindow } from '../data/guideWindow';
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

function Conversation({ thread, onSave, input, setInput, visible }: { thread: AskThread; onSave: (id: string, messages: UIMessage[]) => void; input: string; setInput: (text: string) => void; visible: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null); const end = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop } = useChat({
    id: thread.id, messages: thread.messages as UIMessage[],
    transport: new DefaultChatTransport({ api: ENDPOINT, headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, body: { threadId: thread.id } }),
    onError: e => { let msg = 'The guide couldn’t answer just now. Please try again.'; try { msg = JSON.parse(e.message).error ?? msg; } catch { if (/fetch|network/i.test(e.message)) msg = 'You seem to be offline. Check your connection and try again.'; } setError(msg); },
  });
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => { if (status === 'ready' || status === 'error') onSave(thread.id, messages); }, [status, messages, thread.id, onSave]);
  useEffect(() => { if (visible && messages.length) end.current?.scrollIntoView({ block: 'end' }); }, [messages, status, visible]);
  useEffect(() => { if (visible) box.current?.focus({ preventScroll: true }); }, [visible]);
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
      <textarea ref={box} value={input} rows={2} maxLength={600} placeholder="Ask about a court, park or landmark…" aria-label="Your question" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(input); } }} />
      <div className="ask-composer-foot"><span>Saved on this browser · Shift + Enter for a new line</span>{busy ? <button type="button" className="ask-send" onClick={() => stop()} aria-label="Stop answer"><Icon name="pause" size={14} /></button> : <button type="submit" className="ask-send" disabled={!input.trim()} aria-label="Send question"><Icon name="arrow" size={16} /></button>}</div>
    </form>
  </div>;
}

export function AskIslington({ threadId, onNavigate, onClose, minimized, onMinimizedChange }: { threadId: string | null; onNavigate: (id: string) => void; onClose: () => void; minimized: boolean; onMinimizedChange: (minimized: boolean) => void }) {
  const backdrop = useRef<HTMLDivElement>(null);
  const restore = useRef<HTMLButtonElement>(null);
  const [geometry, setGeometry] = useState(() => initialGuideWindow(window.innerWidth, window.innerHeight));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const gesture = useRef<{ id: number; x: number; y: number; rect: GuideWindow; resize: boolean } | null>(null);
  const constrain = (rect: GuideWindow) => boundGuideWindow(rect, window.innerWidth, window.innerHeight);
  useEffect(() => {
    const resize = () => setGeometry(rect => boundGuideWindow(rect, window.innerWidth, window.innerHeight));
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  function startGesture(event: PointerEvent<HTMLElement>, resize = false) {
    if (event.button !== 0 || window.innerWidth <= 760) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rect: geometry, resize };
  }
  function moveGesture(event: PointerEvent<HTMLElement>) {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    setGeometry(constrain(start.resize ? { ...start.rect, width: start.rect.width + dx, height: start.rect.height + dy } : { ...start.rect, x: start.rect.x + dx, y: start.rect.y + dy }));
  }
  function endGesture() { gesture.current = null; }
  function adjust(event: React.KeyboardEvent<HTMLElement>, resize = false) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 40 : 16;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    setGeometry(rect => constrain(resize ? { ...rect, width: rect.width + dx, height: rect.height + dy } : { ...rect, x: rect.x + dx, y: rect.y + dy }));
  }
  useEffect(() => { if (minimized) restore.current?.focus({ preventScroll: true }); }, [minimized]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      backdrop.current?.style.setProperty('--guide-viewport-height', `${viewport.height}px`);
      backdrop.current?.style.setProperty('--guide-viewport-top', `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => { viewport.removeEventListener('resize', resize); viewport.removeEventListener('scroll', resize); };
  }, []);
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
  return <div ref={backdrop} className="ask-backdrop">
    {minimized && <div className="ask-minimized"><button ref={restore} className="ask-restore" onClick={() => onMinimizedChange(false)} aria-label="Restore guide"><Icon name="ball" size={22}/><span><strong>Ask the guide</strong><small>{active?.title ?? 'Your conversation is still here'}</small></span><Icon name="plus" size={16}/></button><button className="ask-window-button" onClick={onClose} aria-label="Close guide"><Icon name="close" size={17}/></button></div>}
    <section id="ask-guide" hidden={minimized} className="ask-dialog" role="dialog" aria-label="Ask the Islington guide" style={{ '--ask-x': `${geometry.x}px`, '--ask-y': `${geometry.y}px`, '--ask-width': `${geometry.width}px`, '--ask-height': `${geometry.height}px` } as CSSProperties} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onMinimizedChange(true); } }}>
      <aside className="ask-threads" aria-label="Your conversations">
        <button className="ask-new" aria-label="New conversation" title="New conversation" onClick={() => onNavigate(threads.find(t => t.messages.length === 0 && !drafts[t.id]?.trim())?.id ?? newId())}><Icon name="plus" size={14} /> New conversation</button>
        <ul>{threads.filter(t => t.messages.length || drafts[t.id]?.trim() || t.id === threadId).map(t => <li key={t.id} className={t.id === threadId ? 'active' : ''}>
          <button className="ask-thread-open" aria-current={t.id === threadId ? 'page' : undefined} onClick={() => onNavigate(t.id)}>{!t.messages.length && drafts[t.id]?.trim() ? `Draft · ${threadTitle(drafts[t.id])}` : t.title}</button>
          {t.messages.length > 0 && <button className="ask-thread-delete" aria-label={`Delete “${t.title}”`} onClick={() => remove(t.id)}>×</button>}
        </li>)}</ul>
        <p className="ask-threads-note">Saved in this browser only.</p>
      </aside>
      <div className="ask-main">
        <header className="ask-header"><div className="ask-title" onPointerDown={startGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}><div className="ask-eyebrow"><Icon name="ball" size={16}/> YOUR NEIGHBOURHOOD GUIDE</div><h2>Ask the guide</h2><p>Keep exploring. I’ll stay here.</p></div><div className="ask-window-actions"><button className="ask-window-button ask-move" aria-label="Move guide" title="Drag to move, or use arrow keys" onPointerDown={e => startGesture(e)} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} onKeyDown={e => adjust(e)}><Icon name="layers" size={16}/></button><button className="ask-window-button" onClick={() => onMinimizedChange(true)} aria-label="Minimize guide" title="Minimize guide"><Icon name="minus" size={17}/></button><button className="ask-window-button" onClick={onClose} aria-label="Close guide" title="Close guide"><Icon name="close" size={17}/></button></div></header>
        {active ? <Conversation key={active.id} thread={active} onSave={onSave} input={drafts[active.id] ?? ''} setInput={text => setDrafts(prev => ({ ...prev, [active.id]: text }))} visible={!minimized} /> : <div className="ask-conversation" />}
      </div>
      <button className="ask-resize" aria-label="Resize guide" title="Drag to resize, or use arrow keys" onPointerDown={e => startGesture(e, true)} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture} onKeyDown={e => adjust(e, true)}><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M4 11 11 4M8 11l3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg></button>
    </section>
  </div>;
}
