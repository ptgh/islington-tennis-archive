import { useEffect } from 'react'

/** Keep map controls inside the visible browser area, including pinch zoom and
 * mobile chrome/keyboard changes. The guide retains its own fixed-sheet bounds. */
export function useVisibleViewport() {
 useEffect(()=>{
  const viewport=window.visualViewport,style=document.documentElement.style
  const update=()=>{
   style.setProperty('--app-visible-width',`${viewport?.width??window.innerWidth}px`)
   style.setProperty('--app-visible-height',`${viewport?.height??window.innerHeight}px`)
   style.setProperty('--app-visible-left',`${viewport?.offsetLeft??0}px`)
   style.setProperty('--app-visible-top',`${viewport?.offsetTop??0}px`)
  }
  update();viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);window.addEventListener('resize',update)
  return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);for(const key of ['width','height','left','top'])style.removeProperty(`--app-visible-${key}`)}
 },[])
}
