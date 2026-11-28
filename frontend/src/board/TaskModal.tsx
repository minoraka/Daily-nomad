import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { createTask, deleteTask, updateTask } from '../api/endpoints'
import { STATUSES, type Task, type TaskStatus } from '../api/types'
import { Avatar, fullName } from '../layout/Avatar'
import { Field, FormErrors } from '../layout/Field'
import { Modal } from '../layout/Modal'

/** View (read-only) or edit/create a task. `task` null = create. */
export function TaskModal({ task, editable, onClose, onSaved }: {
  task: Task | null
  editable: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)

  if (task && !editable) {
    return (
      <Modal onClose={onClose}>
        <h2 className="pre">{task.title}</h2>
        <div className="form">
          <div className="t-owner list-row">
            <Avatar author={task.owner} size="sm" />
            <Link className="user-link" to={`/users/${task.owner.id}`}>{fullName(task.owner)}</Link>
            <span className={`badge badge-${task.status}`}>{t(`status.${task.status}`)}</span>
          </div>
          <p className={task.description ? 'pre' : 'pre muted'}>{task.description || t('board.no_description')}</p>
          <div className="actions"><button className="btn" onClick={onClose}>{t('board.close')}</button></div>
        </div>
      </Modal>
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (task) await updateTask(task.id, { title, description, status })
      else await createTask({ title, description })
      onSaved()
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!task || !confirm(t('board.confirm_delete'))) return
    await deleteTask(task.id)
    onSaved()
  }

  return (
    <Modal onClose={onClose}>
      <h2>{task ? t('board.edit_task') : t('board.new_task')}</h2>
      <form className="form" onSubmit={submit}>
        <Field label={t('board.task_title')} errors={errors.title}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required autoFocus
            data-testid="task-title" />
        </Field>
        <Field label={t('board.task_description')} errors={errors.description}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
        </Field>
        {task && (
          <Field label={t('board.status')}>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </Field>
        )}
        <FormErrors errors={errors.detail} />
        <div className="actions">
          {task && <button type="button" className="btn btn-danger" onClick={remove}>{t('board.delete')}</button>}
          <button type="button" className="btn" onClick={onClose}>{t('board.cancel')}</button>
          <button className="btn btn-primary" disabled={busy} data-testid="task-save">{t('board.save')}</button>
        </div>
      </form>
    </Modal>
  )
}
