import { useEffect, useMemo, useRef, useState } from 'react'
import { CAMERA_REFRESH_MS, cameraImageUrl, cameraMetadataUrl, cameraInMap, cameraAvailability, filterCameras, type CameraScope, type TrafficCamera } from '../data/trafficCameras'
import { SelectField } from './SelectField'
import { Icon } from './Icon'
import type { useTrafficCameras } from './useTrafficCameras'
import './TrafficCameras.css'

const clock = (time: number) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(time)

function CameraImage({ camera }: { camera: TrafficCamera }) {
  const [refresh, setRefresh] = useState(0), [image, setImage] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
  const [loaded, setLoaded] = useState(0)
  useEffect(() => {
    const update = () => { if (!document.hidden) setRefresh(value => value + 1) }
    const timer = window.setInterval(update, CAMERA_REFRESH_MS)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    let alive = true
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    setStatus('loading'); setImage(null)
    fetch(cameraMetadataUrl(camera), { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw Error('Camera request failed'); return response.json() })
      .then(data => {
        if (!alive) return
        const url = cameraImageUrl(data, camera)
        if (url) setImage(`${url}?t=${Date.now()}`)
        else setStatus('unavailable')
      })
      .catch(() => { if (alive) setStatus('error') })
      .finally(() => window.clearTimeout(timeout))
    return () => { alive = false; controller.abort(); window.clearTimeout(timeout) }
  }, [camera.id, refresh])
  useEffect(() => {
    if (!image || status !== 'loading') return
    const timer = window.setTimeout(() => { setImage(null); setStatus('error') }, 12000)
    return () => window.clearTimeout(timer)
  }, [image, status])
  return <>
    <div className="traffic-camera-image" aria-busy={status === 'loading'}>
      {image && <img key={image} src={image} alt={`TfL traffic camera at ${camera.name}. Capture time is stamped in the image.`} hidden={status !== 'ready'} onLoad={() => { setLoaded(Date.now()); setStatus('ready') }} onError={() => { setImage(null); setStatus('error') }}/>}
      <p role="status">{status === 'loading' ? 'Loading traffic view…' : status === 'unavailable' ? 'TfL reports this camera is unavailable.' : status === 'error' ? 'Camera view unavailable. Try refreshing shortly.' : `Loaded ${clock(loaded)} London time. Check the image timestamp for capture time.`}</p>
    </div>
    <button className="text-button" onClick={() => setRefresh(value => value + 1)}>Refresh camera</button>
  </>
}

type Props = { directory: ReturnType<typeof useTrafficCameras>; open: boolean; onOpenChange: (open: boolean) => void; selectedId: string; onSelect: (camera: TrafficCamera) => void }
export function TrafficCameras({ directory, open, onOpenChange, selectedId, onSelect }: Props) {
  const trigger = useRef<HTMLButtonElement>(null)
  const [scope, setScope] = useState<CameraScope>('nearby'), [query, setQuery] = useState('')
  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const camera of directory.cameras) counts.set(camera.name, (counts.get(camera.name) ?? 0) + 1)
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name))
  }, [directory.cameras])
  const scoped = filterCameras(directory.cameras, scope, '')
  const matches = filterCameras(scoped, 'london', query)
  const camera = directory.cameras.find(item => item.id === selectedId) ?? scoped[0]
  const available = scoped.filter(item => item.available === true).length
  const unavailable = scoped.filter(item => item.available === false).length
  const close = () => { onOpenChange(false); trigger.current?.focus({ preventScroll: true }) }
  return <div className="traffic-cameras" onKeyDown={event => {
    if (event.key === 'Escape' && open && !event.defaultPrevented) { event.preventDefault(); event.stopPropagation(); close() }
  }}>
    <button ref={trigger} className="pill" aria-expanded={open} aria-controls="traffic-cameras-panel" onClick={() => onOpenChange(!open)}>Cameras</button>
    {open && <section id="traffic-cameras-panel" className="traffic-cameras-panel" aria-label="Public traffic cameras">
      <div className="weather-heading"><h2>Street views</h2><button aria-label="Close cameras" onClick={close}><Icon name="close" size={18}/></button></div>
      <p>TfL’s public traffic camera directory. These show roads, not the tennis courts.</p>
      {(directory.loading || directory.error) && <p role="status">{directory.loading ? 'Updating camera directory…' : directory.fetched ? 'Directory refresh failed. Showing the last directory; availability may have changed.' : 'Camera directory unavailable. Try refreshing shortly.'}</p>}
      {directory.fetched > 0 && <>
        <details className="camera-browser">
          <summary>Browse {scoped.length} cameras · {scope === 'nearby' ? 'Islington area' : 'All London'}</summary>
          <fieldset className="camera-scope"><legend>Camera area</legend>
            <label><input type="radio" name="camera-scope" checked={scope === 'nearby'} onChange={() => setScope('nearby')}/> Islington area</label>
            <label><input type="radio" name="camera-scope" checked={scope === 'london'} onChange={() => setScope('london')}/> All London</label>
          </fieldset>
          <p>{available} marked available · {unavailable} unavailable{scoped.length > available + unavailable ? ` · ${scoped.length - available - unavailable} status unknown` : ''}.</p>
          <p>{scope === 'nearby' ? 'Illustrated Islington area and neighbouring streets.' : 'Every valid camera returned by TfL across London. Only cameras within the illustrated area have map pins.'} Directory loaded {clock(directory.fetched)} London time.</p>
          <label className="camera-search">Search cameras<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Street, junction or camera ID"/></label>
          {query && <p>{matches.length} matches of {scoped.length} cameras.</p>}
          {directory.excluded > 0 && <p>{directory.excluded} invalid or duplicate directory records were excluded.</p>}
          <button className="text-button" onClick={directory.refresh} disabled={directory.loading}>Refresh directory</button>
        </details>
        {matches.length > 0 ? <SelectField label="Traffic camera" value={camera?.id ?? ''} placeholder="Choose a camera" options={matches.map(item => ({ value: item.id, label: `${item.name}${duplicateNames.has(item.name) ? ` (${item.id.replace('JamCams_', '')})` : ''} · ${cameraAvailability(item)}` }))} onChange={id => { const next = matches.find(item => item.id === id); if (next) onSelect(next) }}/> : <p>No cameras match this search in the selected area.</p>}
      </>}
      {!directory.fetched && <button className="text-button" onClick={directory.refresh} disabled={directory.loading}>Refresh directory</button>}
      {camera && <>
        <h3 className="camera-selected-name">{camera.name}</h3>
        <CameraImage key={camera.id} camera={camera}/>
        {cameraInMap(camera) ? <button className="text-button" onClick={() => onSelect(camera)}>Find camera on map →</button> : <p>This camera is outside the illustrated Islington map. Its image is available here.</p>}
      </>}
      <p>Directory and selected still refresh about every three minutes while this panel is open. Images may be delayed or interrupted; check the timestamp shown by TfL.</p>
      <p><a href="https://tfl.gov.uk/info-for/open-data-users/our-open-data" target="_blank" rel="noreferrer">Images supplied by TfL Open Data <Icon name="external" size={12}/></a></p>
    </section>}
  </div>
}
