import { useEffect, useRef, useState } from 'react';
import ballLogo from '../assets/loading-ball.jpg.asset.json';
import './LoadingScreen.css';

export function LoadingScreen({ ready }: { ready: boolean }) {
  const mountedAt = useRef(performance.now());
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      setLeaving(true);
      finish = setTimeout(() => setVisible(false), 350);
    }, Math.max(0, 900 - (performance.now() - mountedAt.current)));
    return () => {
      clearTimeout(start);
      if (finish !== undefined) clearTimeout(finish);
    };
  }, [ready]);

  if (!visible) return null;
  return <div className={`loading-screen${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite" aria-label="Loading Islington Tennis">
    <img className="loading-screen-art" src={ballLogo.url} alt="" width="1229" height="768" fetchPriority="high" />
    <p className="loading-screen-name">Islington Tennis</p>
    <p className="loading-screen-caption">London, at play.</p>
  </div>;
}