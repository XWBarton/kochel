import { Disclosure } from './Disclosure'
import type { ReviewComposer } from './reviewTypes'
import shared from './ImportShared.module.css'

interface ComposerFieldsFormProps {
  value: ReviewComposer
  onChange: (composer: ReviewComposer) => void
}

/** The "Name" field, shared verbatim between the import review flow and
 * post-import editing so both look identical. */
export function ComposerNameField({ value, onChange }: ComposerFieldsFormProps) {
  return (
    <div className={shared.fieldRow}>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Name</span>
        <input
          className={shared.input}
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </label>
    </div>
  )
}

/** The collapsed "more details" fields (sort name, birth/death year,
 * period) — shared between the import review flow and post-import editing
 * on the composer detail page. */
export function ComposerDetailsDisclosure({ value, onChange }: ComposerFieldsFormProps) {
  return (
    <Disclosure label="Sort name, birth/death year, period…">
      <div className={shared.fieldRow}>
        <label className={shared.field}>
          <span className={shared.fieldLabel}>Sort name</span>
          <input
            className={shared.input}
            placeholder="Last, First"
            value={value.sortName}
            onChange={(e) => onChange({ ...value, sortName: e.target.value })}
          />
        </label>
        <label className={shared.field}>
          <span className={shared.fieldLabel}>Birth year</span>
          <input
            className={shared.input}
            type="number"
            value={value.birthYear ?? ''}
            onChange={(e) => onChange({ ...value, birthYear: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <label className={shared.field}>
          <span className={shared.fieldLabel}>Death year</span>
          <input
            className={shared.input}
            type="number"
            value={value.deathYear ?? ''}
            onChange={(e) => onChange({ ...value, deathYear: e.target.value ? Number(e.target.value) : null })}
          />
        </label>
        <label className={shared.field}>
          <span className={shared.fieldLabel}>Period</span>
          <input
            className={shared.input}
            placeholder="baroque, romantic…"
            value={value.period ?? ''}
            onChange={(e) => onChange({ ...value, period: e.target.value })}
          />
        </label>
      </div>
    </Disclosure>
  )
}
