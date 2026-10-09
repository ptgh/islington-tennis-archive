import { useState } from 'react';
import { CENTRE_SOURCE, centreCoaches, centreSessions } from '../data/centre';
export function CentreProgramme(){
  const [query,setQuery]=useState('');
  const matches=centreCoaches.filter(coach=>`${coach.name} ${coach.specialism}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <section className="centre-programme" aria-label="Islington Tennis Centre coaches and sessions">
    <h2>Coaches & sessions</h2><p>From Better’s published programme · Checked 22 September 2026. Times are London local time.</p>
    <details><summary>14 registered private coaches</summary><p>Arrange lessons directly. LTA levels are those published by Better.</p><input aria-label="Search centre coaches" placeholder="Name or specialism" value={query} onChange={e=>setQuery(e.target.value)}/><p role="status">{matches.length} coaches</p>{matches.map(coach=><article key={coach.name}><h3>{coach.name} <small>LTA {coach.level}</small></h3><p>{coach.specialism}</p><a href={`tel:+44${coach.phone.replace(/\s/g,'').slice(1)}`}>{coach.phone}</a></article>)}{!matches.length&&<p>No coaches match. Try a name or a different specialism.</p>}</details>
    {centreSessions.map(group=><details key={group.name}><summary>{group.name}</summary><dl>{group.rows.map(([label,time])=><div key={label}><dt>{label}</dt><dd>{time}</dd></div>)}</dl><p>{group.note}</p></details>)}
    <a href={CENTRE_SOURCE} target="_blank" rel="noreferrer">Current programme, prices & booking ↗</a>
  </section>;
}
