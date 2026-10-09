import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import './FieldPicker.css'

export type FieldPickerOption = { value: string; label: string; group?: string }

/** A compact, searchable listbox for the racquet room and future editorial forms. */
export function FieldPicker({ label, value, options, onChange, searchable = false }: {
  label: string
  value: string
  options: FieldPickerOption[]
  onChange: (value: string) => void
  searchable?: boolean
}) {
  const id = useId()
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [placement, setPlacement] = useState<'up' | 'down'>('down')
  const [maxHeight, setMaxHeight] = useState(264)
  const visible = options.filter(option => `${option.label} ${option.group ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const selected = options.find(option => option.value === value)

  function show() {
    const bounds = root.current?.getBoundingClientRect()
    const scrollBounds = root.current?.closest('.racquet-studio-body')?.getBoundingClientRect()
    if (bounds) {
      const top = scrollBounds?.top ?? 0
      const bottom = scrollBounds?.bottom ?? window.innerHeight
      const above = bounds.top - top
      const below = bottom - bounds.bottom
      const nextPlacement = below < 250 && above > below ? 'up' : 'down'
      setPlacement(nextPlacement)
      setMaxHeight(Math.max(120, Math.min(264, (nextPlacement === 'up' ? above : below) - 12)))
    }
    setQuery('')
    setOpen(true)
  }
  function hide() { setOpen(false); setQuery('') }
  function choose(next: string) {
    onChange(next)
    hide()
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }

  useEffect(() => {
    if (!open) return
    const onOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) hide() }
    document.addEventListener('pointerdown', onOutside)
    if (searchable) search.current?.focus({ preventScroll: true })
    else list.current?.querySelector<HTMLButtonElement>('[aria-selected="true"], [role="option"]')?.focus({ preventScroll: true })
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [open, searchable])

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (event.target === trigger.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { event.preventDefault(); show() }
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); hide(); trigger.current?.focus({ preventScroll: true }); return }
    const items = Array.from(list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])
    if (!items.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'ArrowDown' ? (current + 1) % items.length : (current < 0 ? items.length - 1 : current - 1 + items.length) % items.length
      items[next].focus({ preventScroll: true })
      items[next].scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next = event.key === 'Home' ? items[0] : items[items.length - 1]
      next.focus({ preventScroll: true })
      next.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter' && event.target === search.current) {
      event.preventDefault()
      if (visible[0]) choose(visible[0].value)
    }
  }

  let previousGroup = ''
  return <div className={`field-picker${open ? ' field-picker-open' : ''}`} ref={root} onKeyDown={onKeyDown}>
    <span className="field-picker-label" id={`${id}-label`}>{label}</span>
    <button ref={trigger} type="button" className="field-picker-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined} onClick={() => open ? hide() : show()}>
      <span id={`${id}-value`}>{selected?.label ?? options[0]?.label}</span><span className="field-picker-chevron" aria-hidden="true" />
    </button>
    {open && <div className={`field-picker-menu field-picker-menu-${placement}`} style={{ maxHeight }}>
      {searchable && <div className="field-picker-search"><input ref={search} type="search" aria-label={`Search ${label.toLowerCase()}`} value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a frame…" /></div>}
      <div className="field-picker-options" id={`${id}-list`} ref={list} role="listbox" aria-labelledby={`${id}-label`}>
        {visible.map(option => {
          const groupChanged = !!option.group && option.group !== previousGroup
          previousGroup = option.group ?? ''
          return <div key={option.value || '__empty'}>
            {groupChanged && <div className="field-picker-group" role="presentation">{option.group}</div>}
            <button type="button" role="option" aria-selected={option.value === value} className="field-picker-option" onClick={() => choose(option.value)}><span>{option.label}</span>{option.value === value && <span aria-hidden="true">✓</span>}</button>
          </div>
        })}
        {!visible.length && <p className="field-picker-empty">No matching frames.</p>}
      </div>
    </div>}
  </div>
}
