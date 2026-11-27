import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { createDaily, listTasks, updateDaily } from '../api/endpoints'
import type { Daily, Task } from '../api/types'
import { useMe } from '../auth/AuthContext'
import { Field, FormErrors } from '../layout/Field'

export function DailyForm({ initial, onSaved, onCancel }: {
  initial?: Daily | null
  onSaved: (d: Daily) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const me = useMe()
  const [done, setDone] = useState(initial?.done ?? '')
  const [plans, setPlans] = useState(initial?.plans ?? '')
  const [blockers, setBlockers] = useState(initial?.blockers ?? '')
  const [taskIds, setTaskIds] = useState<number[]>(initial?.tasks.map((x) => x.id) ?? [])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listTasks({ owner: me.id }).then(setMyTasks, () => setMyTasks([]))
  }, [me.id])

  const toggle = (id: number) => setTaskIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      const data = { done, plans, blockers, task_ids: taskIds }
      onSaved(initial ? await updateDaily(initial.id, data) : await createDaily(data))
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form card" onSubmit={submit} data-testid="daily-form">
      <div className="card-header">{t('dailies.new')}</div>
      <Field label={t('dailies.done')} errors={errors.done}>
        <textarea value={done} onChange={(e) => setDone(e.target.value)} required autoFocus
          placeholder={t('dailies.done_placeholder')} data-testid="daily-done" />
      </Field>
      <Field label={t('dailies.plans')} errors={errors.plans}>
        <textarea value={plans} onChange={(e) => setPlans(e.target.value)} placeholder={t('dailies.plans_placeholder')} />
      </Field>
      <Field label={t('dailies.blockers')} errors={errors.blockers}>
        <textarea value={blockers} onChange={(e) => setBlockers(e.target.value)}
          placeholder={t('dailies.blockers_placeholder')} />
      </Field>
      <Field group label={t('dailies.tasks')} errors={errors.task_ids}>
        <div className="chips">
          {myTasks.length === 0 && <span className="muted small">{t('dailies.no_tasks')}</span>}
          {myTasks.map((task) => (
            <button type="button" key={task.id} className={taskIds.includes(task.id) ? 'chip selected' : 'chip'}
              onClick={() => toggle(task.id)} aria-pressed={taskIds.includes(task.id)}>
              {task.title}
            </button>
          ))}
        </div>
      </Field>
      <FormErrors errors={[...(errors.non_field_errors ?? []), ...(errors.detail ?? [])]} />
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>{t('dailies.cancel')}</button>
        <button className="btn btn-primary" disabled={busy} data-testid="daily-save">{t('dailies.save')}</button>
      </div>
    </form>
  )
}
