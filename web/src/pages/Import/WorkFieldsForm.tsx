import { Disclosure } from './Disclosure'
import type { ReviewWork } from './reviewTypes'
import shared from './ImportShared.module.css'

interface WorkFieldsFormProps {
  value: ReviewWork
  onChange: (work: ReviewWork) => void
}

/** The "Title" field, shared verbatim between the import review flow and
 * post-import editing so both look identical. */
export function WorkTitleField({ value, onChange }: WorkFieldsFormProps) {
  return (
    <div className={shared.fieldRow}>
      <label className={shared.field}>
        <span className={shared.fieldLabel}>Title</span>
        <input
          className={shared.input}
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </label>
    </div>
  )
}

/** The collapsed "more details" fields (subtitle, key, form, category,
 * composed year, catalogue numbers) — shared between the import review
 * flow and post-import editing on the work detail page. */
export function WorkDetailsDisclosure({ value, onChange }: WorkFieldsFormProps) {
  return (
    <Disclosure label="Subtitle, key, catalogue number…">
        <div className={shared.fieldRow}>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Subtitle</span>
            <input
              className={shared.input}
              value={value.subtitle}
              onChange={(e) => onChange({ ...value, subtitle: e.target.value })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Key</span>
            <input
              className={shared.input}
              placeholder="G minor"
              value={value.key}
              onChange={(e) => onChange({ ...value, key: e.target.value })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Form</span>
            <input
              className={shared.input}
              placeholder="symphony, concerto…"
              value={value.form}
              onChange={(e) => onChange({ ...value, form: e.target.value })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Category</span>
            <input
              className={shared.input}
              placeholder="Orchestral, Chamber…"
              value={value.category}
              onChange={(e) => onChange({ ...value, category: e.target.value })}
            />
          </label>
          <label className={shared.field}>
            <span className={shared.fieldLabel}>Composed year</span>
            <input
              className={shared.input}
              type="number"
              value={value.composedYear ?? ''}
              onChange={(e) => onChange({ ...value, composedYear: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        </div>
      <CatalogueNumbersEditor value={value} onChange={onChange} />
    </Disclosure>
  )
}

function CatalogueNumbersEditor({ value, onChange }: { value: ReviewWork; onChange: (w: ReviewWork) => void }) {
  function update(i: number, patch: Partial<ReviewWork['catalogueNumbers'][number]>) {
    const next = value.catalogueNumbers.map((cn, idx) => (idx === i ? { ...cn, ...patch } : cn))
    onChange({ ...value, catalogueNumbers: next })
  }
  function remove(i: number) {
    onChange({ ...value, catalogueNumbers: value.catalogueNumbers.filter((_, idx) => idx !== i) })
  }
  function add() {
    onChange({
      ...value,
      catalogueNumbers: [...value.catalogueNumbers, { system: '', number: '', isPrimary: value.catalogueNumbers.length === 0 }],
    })
  }

  return (
    <div style={{ marginTop: 12 }}>
      <span className={shared.fieldLabel}>Catalogue numbers</span>
      {value.catalogueNumbers.map((cn, i) => (
        <div className={shared.repeatRow} key={i}>
          <input
            className={shared.input}
            placeholder="System (BWV, K, Op…)"
            value={cn.system}
            onChange={(e) => update(i, { system: e.target.value })}
          />
          <input
            className={shared.input}
            placeholder="Number"
            value={cn.number}
            onChange={(e) => update(i, { number: e.target.value })}
          />
          <label className={shared.checkboxRow} style={{ flex: 'none' }}>
            <input type="checkbox" checked={cn.isPrimary} onChange={(e) => update(i, { isPrimary: e.target.checked })} />
            primary
          </label>
          <button className={shared.repeatRowRemove} onClick={() => remove(i)} aria-label="Remove">
            ✕
          </button>
        </div>
      ))}
      <button className={shared.buttonSmall} onClick={add}>
        + Add catalogue number
      </button>
    </div>
  )
}
