import { useEffect, useRef } from 'react'
import type { LogEntry } from '@renderer/flow/types'
import './LogPanel.css'

export function LogPanel({ entries }: { entries: LogEntry[] }): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [entries.length])

  return (
    <div className="log-panel scroll-region">
      {entries.length === 0 && <div className="log-panel__empty">Nothing yet.</div>}
      {entries.map((e) => (
        <div key={e.id} className={`log-panel__line log-panel__line--${e.tone}`}>
          <span className="log-panel__time">{e.time}</span>
          <span>{e.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}
