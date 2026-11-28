import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { assignTasks, createTask, getGroupStudents } from '../api/endpoints'
import type { Author, TaskInput } from '../api/types'
import { fullName } from '../layout/Avatar'
import { Field, FormErrors } from '../layout/Field'
import { Modal } from '../layout/Modal'
import { PillTabs } from '../layout/PillTabs'
import { emptyTaskInput, TaskMetaFields } from './TaskFields'

type Target = 'group' | 'students'

/** Create a personal task (student) or assign a task to students (teacher). */
export function TaskForm({ mode, groupId, onClose, onSaved }: {
  mode: 'personal' | 'assign'
  groupId: number | null
  onClose: () => void
  onSaved: (count: number) => void
}) {
  const { t } = useTranslation()
  const [value, setValue] = useState<TaskInput>(emptyTaskInput)
  const [target, setTarget] = useState<Target>('group')
  const [students, setStudents] = useState<Author[]>([])
  const [picked, setPicked] = useState<number[]>([])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (mode === 'assign' && groupId) getGroupStudents(groupId).then(setStudents, () => setStudents([]))
  }, [mode, groupId])

  const toggle = (id: number) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      if (mode === 'personal') {
        await createTask(value)
        onSaved(1)
      } else {
        const created = await assignTasks(target === 'group' ? { ...value, group: groupId ?? 0 } : { ...value, assignees: picked })
        onSaved(created.length)
      }
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2>{mode === 'assign' ? t('board.assign_title') : t('board.new_task')}</h2>
      <form className="form" onSubmit={submit}>
        <Field label={t('board.task_title')} errors={errors.title}>
          <input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} maxLength={200}
            required autoFocus data-testid="task-title" />
        </Field>
        <Field label={t('board.task_description')} errors={errors.description}>
          <textarea value={value.description} onChange={(e) => setValue({ ...value, description: e.target.value })} rows={3} />
        </Field>
        <TaskMetaFields value={value} onChange={setValue} errors={errors} />
        {mode === 'assign' && (
          <Field label={t('board.assign_to')} errors={[...(errors.group ?? []), ...(errors.assignees ?? [])]} group>
            <PillTabs<Target> value={target} onChange={setTarget}
              tabs={[{ key: 'group', label: t('board.target_group') }, { key: 'students', label: t('board.target_students') }]} />
            {target === 'students' && (
              <div className="chips">
                {students.map((s) => (
                  <button type="button" key={s.id} className={picked.includes(s.id) ? 'chip selected' : 'chip'}
                    aria-pressed={picked.includes(s.id)} onClick={() => toggle(s.id)}>
                    {fullName(s)}
                  </button>
                ))}
              </div>
            )}
          </Field>
        )}
        <FormErrors errors={[...(errors.non_field_errors ?? []), ...(errors.detail ?? [])]} />
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>{t('board.cancel')}</button>
          <button className="btn btn-primary" disabled={busy} data-testid="task-save">
            {mode === 'assign' ? t('board.assign_btn') : t('board.save')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
