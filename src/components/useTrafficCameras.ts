import { useCallback, useEffect, useState } from 'react'
import { CAMERA_DIRECTORY_URL, CAMERA_REFRESH_MS, parseCameraDirectory, type TrafficCamera } from '../data/trafficCameras'

export function useTrafficCameras(active: boolean) {
  const [cameras, setCameras] = useState<TrafficCamera[]>([])
  const [fetched, setFetched] = useState(0), [excluded, setExcluded] = useState(0)
  const [loading, setLoading] = useState(false), [error, setError] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    if (!active) return
    const controller = new AbortController()
    let alive = true
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    setLoading(true); setError(false)
    fetch(CAMERA_DIRECTORY_URL, { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw Error('Camera directory unavailable'); return response.json() })
      .then(data => {
        const directory = parseCameraDirectory(data)
        if (alive) { setCameras(directory.cameras); setExcluded(directory.excluded); setFetched(Date.now()) }
      })
      .catch(() => { if (alive) setError(true) })
      .finally(() => { window.clearTimeout(timeout); if (alive) setLoading(false) })
    return () => { alive = false; controller.abort(); window.clearTimeout(timeout) }
  }, [active, revision])
  useEffect(() => {
    if (!active) return
    const update = () => { if (!document.hidden) refresh() }
    const timer = window.setInterval(update, CAMERA_REFRESH_MS)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [active, refresh])
  return { cameras, fetched, excluded, loading, error, refresh }
}
