import type { CSSProperties } from 'react';

export type IconName = 'ball' | 'court' | 'search' | 'arrow' | 'external' | 'back' | 'close' | 'sun' | 'moon' | 'plus' | 'minus' | 'reset' | 'rotate' | 'train' | 'pin' | 'layers' | 'pause' | 'play' | 'check' | 'info' | 'bus' | 'bag' | 'people';
const paths: Record<IconName, React.ReactNode> = {
  bus: <><rect x="4" y="3" width="16" height="16" rx="3"/><path d="M4 9h16M4 14h16M9 3v11M15 3v11M7 19v2m10-2v2M7 16h1m8 0h1"/></>,
  bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>,
  people: <><circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v3"/></>,
  ball: <><circle cx="12" cy="12" r="9"/><path d="M5 6c7 0 11 6 10 14M10 3c-2 7 2 13 10 14"/></>,
  court: <><rect x="4" y="2.5" width="16" height="19" rx="1"/><path d="M7 3v18M17 3v18M4 12h16M7 7h10M7 17h10M12 7v10"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  arrow: <path d="M4 12h15m-5-5 5 5-5 5"/>,
  external: <><path d="M14 4h6v6m0-6L10 14M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></>,
  back: <path d="M20 12H5m5-5-5 5 5 5"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
  moon: <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  minus: <path d="M5 12h14"/>,
  reset: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
  rotate: <><path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/></>,
  train: <><rect x="6" y="3" width="12" height="15" rx="3"/><path d="M6 10h12M9 18l-3 4m9-4 3 4M9 20h6M12 3v7"/><path d="M9 14h.01M15 14h.01"/></>,
  pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  layers: <><path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/></>,
  pause: <><path d="M9 5v14M15 5v14"/></>,
  play: <path d="m8 4 12 8-12 8Z"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.01"/></>,
};
export function Icon({name, size=20, style}: {name:IconName;size?:number;style?:CSSProperties}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
