import { useState } from 'react'
import { Icon } from './Icon'
import { parseRacquetProfile, RACQUET_PROFILE_KEY, racquets } from '../data/racquets'
import './CourtPractice.css'

type Drill = 'serve' | 'rally'
const patterns = {
  serve: [
    { name:'Wide serve, open court', detail:'Serve wide from the deuce side. Recover towards the centre and picture your next ball into the space you have opened.', target:{x:12,y:43,w:23,h:32}, player:{x:68,y:147}, landing:{x:24,y:57}, path:'M68 143 Q58 91 24 57' },
    { name:'Serve towards the T', detail:'Aim nearer the centre line. Reset your feet after the serve and prepare to meet the return from a balanced position.', target:{x:51,y:43,w:20,h:32}, player:{x:68,y:147}, landing:{x:60,y:57}, path:'M68 143 Q79 98 60 57' },
  ],
  rally: [
    { name:'Deep crosscourt backhand', detail:'Feed to the backhand, send the ball high and deep across court, then recover before the next feed.', target:{x:10,y:6,w:27,h:30}, player:{x:72,y:145}, landing:{x:24,y:20}, path:'M72 142 Q28 95 24 20' },
    { name:'Change the deep lane', detail:'After a controlled crosscourt ball, redirect the next feed into the other deep lane. Leave room above the net.', target:{x:63,y:6,w:27,h:30}, player:{x:28,y:145}, landing:{x:76,y:20}, path:'M28 142 Q72 95 76 20' },
  ],
} as const
const practiceIdeas = {
  serve: {
    name:'The next ball', inspiration:'HARRY HOPMAN · POINT BUILDING',
    steps:'A serve creates the next shot. Use the court sketch to picture a target, your recovery, and the open space before playing.',
    story:['Harry Hopman led Australia through an extraordinary Davis Cup period and coached generations of players. Accounts of his work describe a demanding focus on movement, depth and the next point, alongside technical practice.','In a 2012 Tennis Australia coach profile, Jay Deacon recalls a teenage hit with Hopman and learning that constructing a point meant moving an opponent, not merely striking the ball. The lesson carried into Deacon’s own coaching.','This is a present-day court sketch inspired by that point-building outlook. It is not presented as one of Hopman’s own drills: serve to a chosen area, recover, and imagine the reply before your next ball.'],
    source:'https://www.tennisfame.com/hall-of-famers/inductees/harry-hopman', sourceLabel:'Hall of Fame profile',
    further:'https://www.tennis.com.au/doc/my-coach-july-2012', furtherLabel:'Tennis Australia · My Coach (July 2012)',
  },
  rally: {
    name:'The backhand lane', inspiration:'KEN ROSEWALL · CONTROL & PLACEMENT',
    steps:'Rosewall’s backhand offers a picture of control. Trace a deep lane, recover, then explore a change of direction.',
    story:['Ken Rosewall’s backhand was celebrated for its control and precise placement. His game also relied on speed and adapting his position rather than simply hitting harder.','The two paths below turn that idea into a simple visual: find depth crosscourt first, recover, then choose a deep lane on the other side. This is a modern illustration, not a claim about Rosewall’s personal training routine.'],
    source:'https://www.tennisfame.com/hall-of-famers/inductees/ken-rosewall/', sourceLabel:'Hall of Fame profile',
  },
} as const

export function CourtPractice({ venueName, onClose }: { venueId: string; venueName: string; onClose: () => void }) {
  const [drill, setDrill] = useState<Drill>('serve')
  const [patternIndex, setPatternIndex] = useState(0)
  const [showStory, setShowStory] = useState(false)
  const profile = (() => { try { return parseRacquetProfile(localStorage.getItem(RACQUET_PROFILE_KEY)) } catch { return parseRacquetProfile(null) } })()
  const frame = racquets.find(item => item.id === profile.racquetId)?.name || profile.otherRacquet
  const idea = practiceIdeas[drill]
  const pattern = patterns[drill][patternIndex]

  function changeDrill(next: Drill) { setDrill(next); setPatternIndex(0); setShowStory(false) }

  return <section className="court-practice" aria-label={`Practice at ${venueName}`}>
    <header className="court-practice-head"><div><span>COURT-SIDE SKETCH</span><h2>Picture the point.</h2><p>{venueName}</p></div><button className="court-practice-close" onClick={onClose} aria-label="Close practice"><Icon name="close" size={18}/></button></header>
    <p className="court-practice-intro">Choose a pattern to see the racquet position, ball path and landing area. An idea for your next hit, not live tracking.</p>
    <div className="court-practice-drills" aria-label="Choose a drill"><button aria-pressed={drill === 'serve'} onClick={() => changeDrill('serve')}>Serve placement</button><button aria-pressed={drill === 'rally'} onClick={() => changeDrill('rally')}>Rally depth</button></div>
    <aside className="court-practice-idea"><span>{idea.inspiration}</span><strong>{idea.name}</strong><p>{idea.steps}</p><button type="button" aria-expanded={showStory} onClick={() => setShowStory(value => !value)}>{showStory ? 'Close the story' : 'The story behind the idea'} <Icon name="arrow" size={12}/></button>
      {showStory && <div className="court-practice-story">{idea.story.map(paragraph => <p key={paragraph}>{paragraph}</p>)}<a href={idea.source} target="_blank" rel="noreferrer">{idea.sourceLabel} <Icon name="external" size={12}/></a>{'further' in idea && <a href={idea.further} target="_blank" rel="noreferrer">{idea.furtherLabel} <Icon name="external" size={12}/></a>}</div>}
      <small>Inspired by their play and coaching; a modern suggestion, not a historical drill.</small>
    </aside>
    <div className="court-practice-diagram" role="img" aria-label={`${pattern.name}: illustrated racquet at the baseline and ball path towards the highlighted landing area`}>
      <div className="practice-court" aria-hidden="true"><div className="practice-court-singles"/><div className="practice-court-net"/><div className="practice-court-service"/><div className="practice-court-centre"/></div>
      <svg className="practice-annotation" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="practice-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0L5 2.5 0 5Z" fill="#f8f0c8"/></marker></defs>
        <rect x={pattern.target.x} y={pattern.target.y} width={pattern.target.w} height={pattern.target.h} rx="3" fill="#e9e7a1" fillOpacity=".48" stroke="#fcf5ce" strokeWidth="1.5"/>
        <path d={pattern.path} fill="none" stroke="#214c40" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round"/><path d={pattern.path} fill="none" stroke="#f8f0c8" strokeWidth="2" strokeDasharray="4 3" markerEnd="url(#practice-arrow)"/>
        <circle cx={pattern.landing.x} cy={pattern.landing.y} r="4" fill="#f2ee94" stroke="#fff9df" strokeWidth="1.5"/>
        <g transform={`translate(${pattern.player.x} ${pattern.player.y-5}) rotate(-18)`}>
          <ellipse cy="-5" rx="4.5" ry="7" fill="#f6f0cf" fillOpacity=".84" stroke="#244b3d" strokeWidth="1.5"/>
          <path d="M-3 -8H3M-3 -5H3M-2.5 -2H2.5M-1.5 -10V0M1.5 -10V0" fill="none" stroke="#759887" strokeWidth=".65"/>
          <path d="M0 2V10" stroke="#244b3d" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M-1.8 9H1.8V14H-1.8Z" fill="#c79d6e" stroke="#244b3d" strokeWidth=".8"/>
        </g>
      </svg><span className="practice-baseline">YOUR BASELINE</span>
    </div>
    <div className="court-practice-pattern"><div><span>{String(patternIndex+1).padStart(2,'0')} / {String(patterns[drill].length).padStart(2,'0')}</span><strong>{pattern.name}</strong></div><button type="button" onClick={() => setPatternIndex(index => (index+1)%patterns[drill].length)} aria-label="Show next pattern">Next <Icon name="arrow" size={13}/></button></div>
    <p className="court-practice-pattern-detail">{pattern.detail}</p>
    <div className="court-practice-kit"><span>IN YOUR BAG</span><strong>{frame || 'Add a frame in the racquet room'}</strong>{frame && <small>{[profile.gripSize && `Grip ${profile.gripSize}`, profile.strings].filter(Boolean).join(' · ') || 'Strings not recorded'}</small>}</div>
  </section>
}
