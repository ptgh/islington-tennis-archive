import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { FieldPicker, type FieldPickerOption } from './FieldPicker'
import { emptyRacquetProfile, parseRacquetProfile, RACQUET_PROFILE_KEY, racquetPlayers, racquets, UTR_SOURCE, GRIP_SIZE_SOURCE, wilsonStrings, luxilonStrings, WILSON_STRINGS_SOURCE, LUXILON_STRINGS_SOURCE, type Racquet, type RacquetProfile } from '../data/racquets'
import './RacquetStudio.css'
import { racquetPhotos } from '../data/racquetPhotos'

const frameOptions: FieldPickerOption[] = [
  { value:'', label:'Another frame / not sure' },
  ...racquets.map(r => ({ value:r.id, label:r.name, group:r.era === 'archive' ? 'From the archive' : r.family })),
]
const stringOptions: FieldPickerOption[] = [
  { value:'', label:'Choose / not sure' },
  ...wilsonStrings.map(name => ({ value:name, label:name, group:'Wilson' })),
  ...luxilonStrings.map(name => ({ value:name, label:name, group:'Luxilon' })),
  { value:'other', label:'Another string…', group:'Other' },
]
const gripOptions: FieldPickerOption[] = [
  { value:'', label:'Choose / not sure' },
  ...['4″', '4⅛″', '4¼″', '4⅜″', '4½″', '4⅝″'].map((inches, size) => ({ value:String(size), label:`Size ${size} · ${inches}` })),
]

function RacquetDrawing({ racquet }: { racquet: Racquet }) {
  const clip = `strings-${racquet.id}`
  return <svg className="racquet-drawing" viewBox="0 0 150 270" aria-hidden="true">
    <defs><clipPath id={clip}><ellipse cx="75" cy="88" rx="38" ry="58" /></clipPath></defs>
    <g transform="rotate(-14 75 136)">
      <ellipse cx="75" cy="88" rx="47" ry="67" fill="none" stroke={racquet.frame} strokeWidth="12" />
      <ellipse cx="75" cy="88" rx="42" ry="62" fill="none" stroke={racquet.accent} strokeWidth="3" />
      <g clipPath={`url(#${clip})`} stroke="#aeb8ad" strokeWidth=".65" opacity=".75">
        {[43,51,59,67,75,83,91,99,107].map(x=><path key={x} d={`M${x} 21V155`}/>)}
        {[40,49,58,67,76,85,94,103,112,121,130,139].map(y=><path key={y} d={`M25 ${y}H125`}/>)}
      </g>
      <path d="M43 145 69 184 M107 145 81 184" fill="none" stroke={racquet.frame} strokeWidth="7" strokeLinecap="round" />
      <path d="M68 177H82V223H68Z" fill={racquet.frame} />
      <path d="M65 211H85V257Q75 263 65 257Z" fill="#373d3a" />
      {[219,226,233,240,247].map(y=><path key={y} d={`M66 ${y}H84`} stroke={racquet.accent} strokeWidth="1.3" opacity=".8"/>)}
      <path d="M65 255H85" stroke={racquet.accent} strokeWidth="4" />
    </g>
  </svg>
}

function RacquetMedia({ racquet, featured = false }: { racquet: Racquet; featured?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <span className={`racquet-media${featured ? ' racquet-media-featured' : ''}${racquet.id === 'blade-sw102' ? ' racquet-media-sw102' : ''}`}>
    {(racquetPhotos[racquet.id] || racquet.image) && !failed
      ? <img src={racquetPhotos[racquet.id] || racquet.image} alt={racquet.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <RacquetDrawing racquet={racquet} />}
  </span>
}

export function RacquetStudio({ onClose, initialView = 'collection', onPartners }: { onClose: () => void; initialView?: 'collection' | 'my-frame'; onPartners: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const storyPanel = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [era, setEra] = useState<'current' | 'archive'>('current')
  const [family, setFamily] = useState('All')
  const [selectedId, setSelectedId] = useState(racquets[0].id)
  const [view, setView] = useState<'collection' | 'my-frame'>(initialView)
  const [storyName, setStoryName] = useState<string | null>(null)
  const [profile, setProfile] = useState<RacquetProfile>(() => { try { return parseRacquetProfile(localStorage.getItem(RACQUET_PROFILE_KEY)) } catch { return { ...emptyRacquetProfile } } })
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const options = racquets.filter(r => r.era === era && (family === 'All' || r.family === family))
  const families = ['All', ...new Set(racquets.filter(r => r.era === era).map(r => r.family))]
  const selected = racquets.find(r => r.id === selectedId) ?? options[0]
  const profileRacquet = racquets.find(r => r.id === profile.racquetId)
  const story = racquetPlayers.find(player => player.name === storyName)
  const storyRacquet = story && racquets.find(r => r.id === story.racquetId)

  useEffect(() => {
    const returnFocus = document.activeElement
    dialog.current?.showModal()
    return () => {
      dialog.current?.close()
      if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus({ preventScroll:true })
    }
  }, [])

  useEffect(() => {
    body.current?.scrollTo({ top:0, behavior:'instant' })
  }, [view, era, family])

  function switchEra(next: 'current' | 'archive') {
    const first = racquets.find(r => r.era === next)
    if (!first) return
    setEra(next); setFamily('All'); setSelectedId(first.id)
    rail.current?.scrollTo({ left:0, behavior:'smooth' })
  }
  function switchFamily(next: string) {
    const first = racquets.find(r => r.era === era && (next === 'All' || r.family === next))
    if (!first) return
    setFamily(next)
    setSelectedId(first.id)
    rail.current?.scrollTo({ left:0, behavior:'smooth' })
  }
  function update(key: keyof RacquetProfile, value: string) { setProfile(p => ({ ...p, [key]:value })); setSaved(false); setSaveError(false) }
  function chooseStrings(value: string) {
    setProfile(p => ({ ...p, stringSource:value === 'other' ? 'other' : luxilonStrings.some(s => s === value) ? 'luxilon' : value ? 'wilson' : '', strings:value === 'other' ? '' : value }))
    setSaved(false); setSaveError(false)
  }
  function save() {
    try { localStorage.setItem(RACQUET_PROFILE_KEY, JSON.stringify(profile)); window.dispatchEvent(new Event('racquet-profile-updated')); setSaved(true); setSaveError(false) }
    catch { setSaved(false); setSaveError(true) }
  }
  function clear() {
    try { localStorage.removeItem(RACQUET_PROFILE_KEY); window.dispatchEvent(new Event('racquet-profile-updated')); setProfile({ ...emptyRacquetProfile }); setSaved(false); setSaveError(false) }
    catch { setSaveError(true) }
  }
  function addSelected() { update('racquetId', selected.id); setView('my-frame') }
  function openStory(name: string) {
    setStoryName(name)
    requestAnimationFrame(() => storyPanel.current?.scrollIntoView({ block:'start', behavior:'smooth' }))
  }

  return <dialog ref={dialog} className="racquet-studio" aria-labelledby="racquet-studio-title" onCancel={onClose} onKeyDown={e=>e.stopPropagation()} onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
    <header className="racquet-studio-head">
      <div><span className="racquet-eyebrow">ISLINGTON TENNIS / GEAR</span><h2 id="racquet-studio-title">The racquet room.</h2><p>Find a frame, follow its story, keep a little record of yours.</p></div>
      <button className="icon-button" aria-label="Close racquet room" onClick={onClose}><Icon name="close"/></button>
    </header>
    <nav className="racquet-studio-tabs" aria-label="Racquet room"><button aria-current={view==='collection'?'page':undefined} onClick={()=>setView('collection')}>The collection</button><button aria-current={view==='my-frame'?'page':undefined} onClick={()=>setView('my-frame')}>My frame {profile.name&&<span>· {profile.name}</span>}</button></nav>
    <div className="racquet-studio-body" ref={body}>
      {view==='collection' ? <>
        <section className="racquet-collection" aria-label="Wilson racquet selection">
          <div className="racquet-collection-toolbar"><div className="racquet-section-top"><div><span className="racquet-eyebrow">01 / WILSON EDIT</span><h3>Find your feel.</h3><p>Browse current variations and selected frames from the archive.</p></div><div className="racquet-era-switch" aria-label="Racquet era"><button aria-pressed={era==='current'} onClick={()=>switchEra('current')}>Current</button><button aria-pressed={era==='archive'} onClick={()=>switchEra('archive')}>Archive</button></div></div>
          <div className="racquet-family-filter" aria-label="Racquet family">{families.map(name=><button key={name} aria-pressed={family===name} onClick={()=>switchFamily(name)}>{name}</button>)}<span>{options.length} frames</span></div></div>
          <div className="racquet-rail-wrap"><button className="racquet-rail-arrow" aria-label="Scroll racquets left" onClick={()=>rail.current?.scrollBy({left:-(rail.current?.clientWidth ?? 0),behavior:'smooth'})}>‹</button><div className="racquet-rail" ref={rail} aria-label="Racquet models, scroll horizontally">{options.map((racquet,index)=><button className="racquet-tile" key={racquet.id} aria-pressed={selected.id===racquet.id} onClick={()=>setSelectedId(racquet.id)} style={{'--frame':racquet.frame,'--accent':racquet.accent} as React.CSSProperties}><span className="racquet-tile-index">{String(index+1).padStart(2,'0')} / {racquet.period}</span><RacquetMedia racquet={racquet}/><span className="racquet-tile-family">{racquet.family}</span><strong>{racquet.name}</strong><span className="racquet-tile-character">{racquet.character}</span></button>)}</div><button className="racquet-rail-arrow" aria-label="Scroll racquets right" onClick={()=>rail.current?.scrollBy({left:rail.current?.clientWidth ?? 0,behavior:'smooth'})}>›</button></div>
          <article className="racquet-selected" key={selected.id}><RacquetMedia racquet={selected} featured/><div className="racquet-selected-copy"><span className="racquet-eyebrow">SELECTED FRAME · {selected.era==='archive'?'FROM THE ARCHIVE':'CURRENT RANGE'}</span><h4>{selected.name}</h4><p>{selected.note}</p></div><div className="racquet-selected-actions"><button onClick={addSelected}>Add to my frame <Icon name="arrow" size={15}/></button><a href={selected.source} target="_blank" rel="noreferrer">{selected.id==='t2000'?'Hall of Fame source':'Wilson source'} <Icon name="external" size={13}/></a></div></article>
          <p className="racquet-collection-note">Racquet photography: Wilson Sporting Goods, the International Tennis Hall of Fame (T2000) and tennisnuts (SW102). Illustrations appear if a photo cannot load. This is a selected collection, not Wilson’s full catalogue or a guide to pro custom setups. <a href="https://www.wilson.com/en-gb/tennis/tennis-rackets" target="_blank" rel="noreferrer">Browse the complete current catalogue ↗</a></p>
        </section>
        <section className={`racquet-legends${story ? ' is-reading' : ''}`} aria-label="Players and their frames"><div><span className="racquet-eyebrow">02 / THE PLAYERS</span><h3>Frames with a story.</h3></div><div className="racquet-player-rail">{racquetPlayers.map((player,index)=><article key={player.name}><span>0{index+1}</span><h4>{player.name}</h4><strong>{player.chapter}</strong><p>{player.text}</p><button type="button" aria-expanded={storyName===player.name} onClick={()=>openStory(player.name)}>Read the story <Icon name="arrow" size={13}/></button></article>)}</div>
          {story && storyRacquet && <article className="racquet-story" ref={storyPanel} aria-label={`${story.name}'s racquet story`}><div className={`racquet-story-art${storyRacquet.id === 't2000' ? ' is-landscape' : ''}`}><RacquetMedia racquet={storyRacquet}/><small>{storyRacquet.name}</small></div><div className="racquet-story-copy"><span className="racquet-eyebrow">A FRAME, A PLAYER</span><h4>{story.name}</h4><strong>{story.chapter}</strong>{story.story.map(paragraph=><p key={paragraph}>{paragraph}</p>)}<a href={story.source} target="_blank" rel="noreferrer">Explore the original source <Icon name="external" size={13}/></a></div><button className="racquet-story-close" type="button" onClick={()=>setStoryName(null)} aria-label="Close story"><Icon name="close" size={17}/></button></article>}
        </section>
      </> : <section className="racquet-profile" aria-label="My racquet profile">
        <div className="racquet-profile-intro">
          <span className="racquet-eyebrow">YOUR COURT BAG</span><h3>A frame with your name on it.</h3>
          <p>Keep your racquet and string setup close. This card stays in this browser and can be changed any time.</p>
          <button className="text-button" onClick={onPartners}><Icon name="people" size={17}/> Find a hitting partner <Icon name="arrow" size={15}/></button>
          <div className={`racquet-profile-preview${profileRacquet ? ' has-racquet' : ''}`}>
            <div className="racquet-profile-copy">
              <span>{profile.name || 'Your name'}{profile.utr ? ` · UTR ${profile.utr}` : ''}</span>
              <strong>{profileRacquet?.name || profile.otherRacquet || 'Your racquet'}</strong>
              <small>{profile.strings || 'Your strings'}{profile.tension ? ` · ${profile.tension}` : ''}</small>
              {profile.gripSize && <small>Grip size {profile.gripSize}</small>}
            </div>
            {profileRacquet && <div className="racquet-profile-portrait" key={profileRacquet.id}><RacquetMedia racquet={profileRacquet}/></div>}
          </div>
        </div>
        <form className="racquet-profile-form" onSubmit={e=>{e.preventDefault();save()}}>
          <label>What should we call you?<input value={profile.name} maxLength={50} onChange={e=>update('name',e.target.value)} placeholder="Your name or court nickname"/></label>
          <label>UTR rating, if you have one<input type="number" min="1" max="16.5" step="0.01" value={profile.utr} onChange={e=>update('utr',e.target.value)} placeholder="E.g. 6.25"/><small>UTR uses 1.00–16.50. <a href={UTR_SOURCE} target="_blank" rel="noreferrer">About UTR ↗</a></small></label>
          <FieldPicker label="Your racquet" value={profile.racquetId} onChange={value=>update('racquetId',value)} options={frameOptions} searchable/>
          <div className="racquet-field"><FieldPicker label="Grip size" value={profile.gripSize} onChange={value=>update('gripSize',value)} options={gripOptions}/><small><a href={GRIP_SIZE_SOURCE} target="_blank" rel="noreferrer">Wilson grip guide ↗</a></small></div>
          {!profile.racquetId&&<label>Other racquet<input value={profile.otherRacquet} maxLength={80} onChange={e=>update('otherRacquet',e.target.value)} placeholder="Brand and model, if you know it"/></label>}
          <div className="racquet-field"><FieldPicker label="Strings" value={profile.stringSource === 'other' ? 'other' : profile.strings} onChange={chooseStrings} options={stringOptions}/><small><a href={WILSON_STRINGS_SOURCE} target="_blank" rel="noreferrer">Wilson</a> · <a href={LUXILON_STRINGS_SOURCE} target="_blank" rel="noreferrer">Luxilon strings ↗</a></small></div>
          {profile.stringSource === 'other'&&<label>Another string<input value={profile.strings} maxLength={80} onChange={e=>update('strings',e.target.value)} placeholder="Brand and string, if you know it"/></label>}
          <label>String tension, if known<input value={profile.tension} maxLength={30} onChange={e=>update('tension',e.target.value)} placeholder="E.g. 52 lb / 24 kg"/></label>
          <label>Your little detail<textarea value={profile.note} maxLength={160} onChange={e=>update('note',e.target.value)} placeholder="What makes this setup yours?" rows={3}/></label>
          <div className="racquet-profile-actions"><button className="primary-button" type="submit">Save my frame <Icon name="arrow" size={16}/></button><button className="racquet-clear" type="button" onClick={clear}>Clear card</button></div>
          <p className="racquet-save-status" role="status">{saveError?'Could not save in this browser. Your edits are still here.':saved?'Your frame is saved in this browser.':'No account needed.'}</p>
        </form>
      </section>}
    </div>
  </dialog>
}
