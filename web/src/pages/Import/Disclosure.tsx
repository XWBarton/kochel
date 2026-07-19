import { useState } from 'react'
import type { ReactNode } from 'react'
import shared from './ImportShared.module.css'

/** A collapsed-by-default section for the "nice to have, edit later"
 * fields — keeps the essential fields the only thing visible up front. */
export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 12 }}>
      <button className={shared.buttonSmall} onClick={() => setOpen((o) => !o)}>
        {open ? '− Fewer details' : `+ ${label}`}
      </button>
      {open && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  )
}
