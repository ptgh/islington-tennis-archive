import type { PlannerPreferences } from '../data/courtPlanner'
import { freeLabel } from '../data/freeCourts'
import type { Venue } from '../data/venues'
import { LIVE_TIME_VENUES, type CourtAvailability } from './useCourtAvailability'
import { SelectField } from './SelectField'
import './CourtPlanner.css'

export function listedTimeLabel(venue: Venue, availability: CourtAvailability) {
  if (!LIVE_TIME_VENUES.includes(venue.id)) return 'Times: check operator'
  if (availability.loading) return 'Checking listed times…'
  if (!availability.fresh) return 'Live times unavailable'
  const next = availability.next[venue.id]
  return next ? `Listed ${freeLabel(next.start)} · ${next.courts} ${next.courts === 1 ? 'court' : 'courts'}` : availability.complete ? 'No times listed in this window' : 'Partial feed · check operator'
}
export function CourtPlanner({ preferences, onChange, availability, storageError, savedCount, savedWithTimes }: { preferences: PlannerPreferences; onChange: (value: PlannerPreferences) => void; availability: CourtAvailability; storageError: boolean; savedCount: number; savedWithTimes: number }) {
  return <details className="court-planner"><summary>When would you like to play?</summary>
    <SelectField label="Playing window" value={preferences.period} options={[{ value: 'next24', label: 'Next 24 hours' }, { value: 'tonight', label: 'This evening · from 18:00' }, { value: 'tomorrow', label: 'Tomorrow' }]} onChange={period => onChange({ ...preferences, period: period as PlannerPreferences['period'] })}/>
    <label className="planner-after">Starting after · London time<input type="time" value={preferences.after} onChange={event => onChange({ ...preferences, after: event.target.value })}/></label>
    {preferences.after && <button className="text-button" onClick={() => onChange({ ...preferences, after: '' })}>Any start time</button>}
    <label className="planner-listed"><input type="checkbox" checked={preferences.listedOnly} onChange={event => onChange({ ...preferences, listedOnly: event.target.checked })}/> Only venues with listed times</label>
    <p role="status">{availability.loading ? 'Checking Better’s open data…' : !availability.fresh ? 'Live times are unavailable. Use the operator links to check availability.' : availability.complete ? 'Better’s feed checked. Confirm your chosen court and time when booking.' : 'The feed returned a partial list. More times may be available with the operator.'}</p>
    <p>Live coverage: Highbury Fields and Islington Tennis Centre. Times are venue-wide; confirm indoor/outdoor and surface when booking. Other venues remain listed unless you select “Only venues with listed times”.</p>
    {savedCount > 0 && <p>{availability.fresh ? `${savedWithTimes} of your ${savedCount} saved venues ${savedWithTimes === 1 ? 'has' : 'have'} times listed in this window.` : `Your ${savedCount} saved venues are ready to check when fresh times are available.`}</p>}
    {availability.fresh&&availability.checked&&<p>Feed last synced {new Date(availability.checked).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/London'})} London time.</p>}
    <small>{storageError ? 'Timing preferences saved for this visit only; browser storage is unavailable.' : 'Timing preferences are remembered on this browser.'}</small>
  </details>
}
export function CourtComparison({ venues, availability, onClear, onDetails }: { venues: Venue[]; availability: CourtAvailability; onClear: () => void; onDetails: (id: string) => void }) {
  if (!venues.length) return null
  return <section className="court-comparison" aria-label="Compare selected courts"><div className="comparison-heading"><h2>Compare {venues.length} of 3</h2><button className="text-button" onClick={onClear}>Clear comparison</button></div>
    {venues.map(venue => <article key={venue.id}><h3>{venue.name}</h3><p>{venue.summary}</p><dl><div><dt>Surface</dt><dd>{venue.surface}</dd></div><div><dt>Lighting</dt><dd>{venue.lighting}</dd></div><div><dt>Access</dt><dd>{venue.accessNote}</dd></div><div><dt>Prices</dt><dd><a href={venue.pricesUrl??venue.actionUrl} target="_blank" rel="noreferrer">Published prices{venue.pricesChecked?` · checked ${venue.pricesChecked}`:' · check operator'} ↗</a></dd></div></dl><p>{listedTimeLabel(venue, availability)}</p><div className="comparison-actions"><button className="text-button" onClick={() => onDetails(venue.id)}>Details & access</button><a href={venue.bookingUrl ?? venue.actionUrl} target="_blank" rel="noreferrer">Official operator ↗</a></div></article>)}
    <p>Listed times can change. Check access, prices and your chosen court with the operator.</p>
  </section>
}
