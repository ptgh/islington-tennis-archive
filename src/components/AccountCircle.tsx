import { useEffect, useRef, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { accountDestination } from '../data/account';
import { Icon } from './Icon';
import { HittingPartners } from './HittingPartners';
import './AccountCircle.css';

export function AccountCircle({ venues, onRacquets, onPartners }: {
  venues: { id: string; name: string }[];
  onRacquets: () => void;
  onPartners: () => void;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const validate = async () => {
      const current = ++revision;
      const { data } = await supabase.auth.getUser();
      if (active && current === revision) setSignedIn(!!data.user);
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      // Keep asynchronous validation outside the auth listener's lock.
      if (!session) { revision++; setSignedIn(false); }
      else setTimeout(() => { if (active) void validate(); }, 0);
    });
    void validate();
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const destination = accountDestination(signedIn);
  return <>
    <button ref={trigger} className="pill account-launch" data-signed-in={signedIn} aria-label={signedIn ? 'Your player profile' : 'Sign up or sign in'} title={signedIn ? 'Your player profile' : 'Sign up or sign in'} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><Icon name="person" size={22}/></button>
    {open && <dialog ref={dialog} className="about-dialog account-dialog" aria-label={signedIn ? 'Your player profile' : 'Create your account'} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <button className="dialog-close icon-button" aria-label="Close account" onClick={close}><Icon name="close"/></button>
      <HittingPartners venues={venues} onBack={close} onRacquets={() => { close(); onRacquets(); }} account initialMode={destination === 'signup' ? 'up' : 'in'} onPartners={() => { close(); onPartners(); }}/>
    </dialog>}
  </>;
}