import { X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ESTIMATES, PRIORITIES, type TaskInput } from '../api/types'
import { Field } from '../layout/Field'
import { labelColor } from './labels'

export const emptyTaskInput = (): TaskInput =>
  ({ title: '', description: '', priority: 'medium', estimate: null, deadline: null, labels: [] })

/** Labels editor: type and press Enter or comma to add; click × to remove. */
export function LabelsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')
  const commit = () => {
    const v = draft.trim().slice(0, 24)
    if (v && !value.some((l) => l.toLowerCase() === v.toLowerCase()) && value.length < 5) onChange([...value, v])
    setDraft('')
  }
  return (
    <div className="labels-input">
      {value.map((l) => (
        <span key={l} className={`label ${labelColor(l)}`}>
          {l}
          <button type="button" aria-label="×" onClick={() => onChange(value.filter((x) => x !== l))}><X size={10} /></button>
        </span>
      ))}
      {value.length < 5 && (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('board.label_placeholder')}
          onBlur={commit} onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1))
          }} data-testid="labels-input" />
      )}
    </div>
  )
}

/** Priority / estimate / deadline / labels block shared by create and detail forms. */
export function TaskMetaFields({ value, onChange, errors }: {
  value: TaskInput
  onChange: (v: TaskInput) => void
  errors: Record<string, string[]>
}) {
  const { t } = useTranslation()
  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => onChange({ ...value, [k]: v })
  return (
    <>
      <div className="row-2">
        <Field label={t('board.priority')} errors={errors.priority}>
          <select value={value.priority} onChange={(e) => set('priority', e.target.value as TaskInput['priority'])}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{t(`priority.${p}`)}</option>)}
          </select>
        </Field>
        <Field label={t('board.estimate')} errors={errors.estimate}>
          <select value={value.estimate ?? ''} onChange={(e) => set('estimate', e.target.value ? Number(e.target.value) : null)}>
            <option value="">—</option>
            {ESTIMATES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t('board.deadline')} errors={errors.deadline}>
        <input type="date" value={value.deadline ?? ''} onChange={(e) => set('deadline', e.target.value || null)} />
      </Field>
      <Field label={t('board.labels')} errors={errors.labels} group>
        <LabelsInput value={value.labels} onChange={(v) => set('labels', v)} />
      </Field>
    </>
  )
}
