import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import { lovable } from '../integrations/lovable/index';
import { Icon } from './Icon';
import { LEVELS, validateProfile, type PlayerProfile } from '../data/players';
import { SelectField } from './SelectField';
import { parseRacquetProfile, RACQUET_PROFILE_KEY, racquets } from '../data/racquets';

type CourtChoice = { id: string; name: string };
const empty: PlayerProfile = { display_name: '', level: 'Improver', utr_rating: null, preferred_courts: [], contact: '', visible: false };

export function HittingPartners({ venues, onBack, onRacquets }: { venues: CourtChoice[]; onBack: () => void; onRacquets: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => { setSession(data.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);
  return <div className="court-detail partners">
    <button className="back-button" onClick={onBack}><Icon name="back" size={17}/> All play options</button>
    <div className="detail-scroll">
      <div className="access-label"><span/>Hitting partners</div>
      <h1 tabIndex={-1}>Find a hitting partner</h1>
      <p className="detail-description">Add a short player card, then see other players at your level and courts. Signing in is optional and only needed for this.</p>
      <button className="service-map-link" onClick={onRacquets} aria-haspopup="dialog"><Icon name="bag" size={20}/><span>My frame<small>Your setup in the racquet room</small></span><Icon name="arrow" size={16}/></button>
      {!ready ? null : session ? <Signed session={session} venues={venues}/> : <SignIn/>}
    </div>
  </div>;
}

function SignIn() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in'); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg('');
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'up' && !data.session) setMsg('Check your email to confirm your account, then sign in.');
  };
  const google = async () => {
    const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin });
    if (r.error) setMsg('Google sign-in didn’t work. Please try again.');
  };
  return <form className="partners-form" onSubmit={submit}>
    <button type="button" className="pill" onClick={google}>Continue with Google</button>
    <label>Email<input type="email" required maxLength={255} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"/></label>
    <label>Password<input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'}/></label>
    <button className="primary-button" disabled={busy}>{mode === 'in' ? 'Sign in' : 'Create account'}</button>
    <button type="button" className="text-button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}</button>
    {msg && <p role="status" className="access-note">{msg}</p>}
  </form>;
}

function Signed({ session, venues }: { session: Session; venues: CourtChoice[] }) {
  const [me, setMe] = useState<PlayerProfile>(empty);
  const [others, setOthers] = useState<(PlayerProfile & { id: string })[]>([]);
  const [court, setCourt] = useState(''); const [msg, setMsg] = useState(''); const [editing, setEditing] = useState(false);
  const uid = session.user.id;
  const [frame, setFrame] = useState(() => { try { return parseRacquetProfile(localStorage.getItem(RACQUET_PROFILE_KEY)); } catch { return parseRacquetProfile(null); } });
  useEffect(() => {
    const sync = () => { try { setFrame(parseRacquetProfile(localStorage.getItem(RACQUET_PROFILE_KEY))); } catch { /* Keep edits if browser storage is unavailable. */ } };
    window.addEventListener('racquet-profile-updated', sync);
    return () => window.removeEventListener('racquet-profile-updated', sync);
  }, []);
  const load = async () => {
    const { data } = await supabase.from('profiles').select('id,display_name,level,utr_rating,preferred_courts,contact,visible').order('updated_at', { ascending: false }).limit(200);
    const mine = data?.find((p: PlayerProfile & { id: string }) => p.id === uid);
    if (mine) setMe(mine); else { setMe({ ...empty, display_name: frame.name, utr_rating: frame.utr ? Number(frame.utr) : null }); setEditing(true); }
    if (mine && !mine.visible) setEditing(true);
    setOthers((data ?? []).filter((p: PlayerProfile & { id: string }) => p.id !== uid && p.visible));
  };
  useEffect(() => { load(); }, [uid]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateProfile(me); if (err) { setMsg(err); return; }
    const { error } = await supabase.from('profiles').upsert({ id: uid, ...me, display_name: me.display_name.trim(), contact: me.contact.trim(), updated_at: new Date().toISOString() });
    if (error) { setMsg('Your card couldn’t be saved. Please try again.'); return; }
    setMsg(''); setEditing(false); load();
  };
  const names = (ids: string[]) => ids.map(id => venues.find(v => v.id === id)?.name).filter(Boolean).join(', ');
  const shown = others.filter(p => !court || p.preferred_courts.includes(court));
  return <>
    {editing ? <form className="partners-form" onSubmit={save}>
      <h2 className="small-heading">Your player card</h2>
      <label>Name<input required maxLength={60} value={me.display_name} onChange={e => setMe({ ...me, display_name: e.target.value })}/></label>
      <SelectField label="Level" value={me.level} onChange={level => setMe({ ...me, level })} options={LEVELS.map(level => ({value:level,label:level}))}/>
      <label>UTR rating (optional)<input inputMode="decimal" placeholder="e.g. 4.5" value={me.utr_rating ?? ''} onChange={e => setMe({ ...me, utr_rating: e.target.value === '' ? null : Number(e.target.value) })}/></label>
      <fieldset><legend>Courts you like to play</legend>{venues.map(v => <label key={v.id} className="partners-check"><input type="checkbox" checked={me.preferred_courts.includes(v.id)} onChange={e => setMe({ ...me, preferred_courts: e.target.checked ? [...me.preferred_courts, v.id] : me.preferred_courts.filter(id => id !== v.id) })}/>{v.name}</label>)}</fieldset>
      <label>How players can reach you<input maxLength={120} placeholder="e.g. Instagram @name or email" value={me.contact} onChange={e => setMe({ ...me, contact: e.target.value })}/></label>
      <label className="partners-check"><input type="checkbox" checked={me.visible} onChange={e => setMe({ ...me, visible: e.target.checked })}/>Show my card to other signed-in players</label>
      <button className="primary-button">Save my card</button>
      {msg && <p role="status" className="access-note">{msg}</p>}
    </form> : <div className="partner-card mine"><strong>{me.display_name}</strong><span>{me.level}{me.utr_rating ? ` · UTR ${me.utr_rating}` : ''}</span><small>{names(me.preferred_courts)}</small><button className="text-button" onClick={() => setEditing(true)}>Edit my card</button></div>}
    {(frame.racquetId || frame.otherRacquet) && <p className="play-context">My frame · {racquets.find(r => r.id === frame.racquetId)?.name || frame.otherRacquet}{frame.strings ? ` · ${frame.strings}` : ''}</p>}
    {!editing && <>
    <h2 className="small-heading">Players looking for a hit</h2>
    <SelectField label="Show players at" value={court} onChange={setCourt} options={[{value:'',label:'All courts'},...venues.map(v => ({value:v.id,label:v.name}))]}/>
    {shown.map(p => <div className="partner-card" key={p.id}><strong>{p.display_name}</strong><span>{p.level}{p.utr_rating ? ` · UTR ${p.utr_rating}` : ''}</span><small>{names(p.preferred_courts)}</small>{p.contact && <small>Contact: {p.contact}</small>}</div>)}
    {!shown.length && <p className="access-note">No players listed here yet. Add your card and you’ll be the first.</p>}
    </>}
    <p className="access-note">Meet in public at the courts and keep personal details to what you’re happy to share. UTR ratings are entered by players and aren’t verified yet.</p>
    <button className="text-button" onClick={() => supabase.auth.signOut()}>Sign out</button>
  </>;
}
