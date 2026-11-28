import { GraduationCap } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { addComment, deleteTask, moveTask, updateTask } from '../api/endpoints'
import { STATUSES, type Me, type Task, type TaskInput, type TaskStatus } from '../api/types'
import { formatDay } from '../i18n/format'
import { Avatar, fullName } from '../layout/Avatar'
import { Field, FormErrors } from '../layout/Field'
import { Modal } from '../layout/Modal'
import { Comments } from './Comments'
import { canDelete, canEditFields, canMove, isBackward } from './policy'
import { ReturnDialog } from './ReturnDialog'
import { Labels, PriorityIcon } from './TaskCard'
import { TaskMetaFields } from './TaskFields'

const END = 9999 // server clamps to the end of the column

export function TaskDetail({ task, me, onClose, onChanged }: {
  task: Task
  me: Me
  onClose: () => void
  onChanged: () => void
}) {
  const { t, i18n } = useTranslation()
  const editable = canEditFields(me, task)
  const [value, setValue] = useState<TaskInput>({
    title: task.title, description: task.description, priority: task.priority, estimate: task.estimate,
    deadline: task.deadline, labels: task.labels,
  })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [busy, setBusy] = useState(false)
  const [returnTo, setReturnTo] = useState<TaskStatus | null>(null)
  const [dirtyComments, setDirtyComments] = useState(false)

  const close = () => {
    if (dirtyComments) onChanged()
    else onClose()
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setErrors({})
    try {
      await action()
      onChanged()
    } catch (err) {
      setErrors(fieldErrors(err))
    } finally {
      setBusy(false)
    }
  }

  function changeStatus(to: TaskStatus) {
    if (to === task.status) return
    if (me.role === 'teacher' && isBackward(task.status, to)) setReturnTo(to)
    else run(() => moveTask(task.id, to, END))
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    run(() => updateTask(task.id, value))
  }

  const remove = () => {
    if (confirm(t('board.confirm_delete'))) run(() => deleteTask(task.id))
  }

  const statuses = STATUSES.filter((s) => s === task.status || canMove(me, task, s))

  return (
    <Modal onClose={close} wide>
      <div className="detail" data-testid="task-detail">
        <div className="detail-main">
        <form className="form" onSubmit={save}>
          <div className="detail-key">
            {task.from_teacher && <GraduationCap size={14} />} {task.key}
          </div>
          {editable ? (
            <>
              <Field label={t('board.task_title')} errors={errors.title}>
                <input value={value.title} onChange={(e) => setValue({ ...value, title: e.target.value })} maxLength={200}
                  required data-testid="detail-title" />
              </Field>
              <Field label={t('board.task_description')} errors={errors.description}>
                <textarea value={value.description} rows={5}
                  onChange={(e) => setValue({ ...value, description: e.target.value })} />
              </Field>
            </>
          ) : (
            <>
              <h2 className="pre">{task.title}</h2>
              <p className={task.description ? 'pre' : 'pre muted'}>{task.description || t('board.no_description')}</p>
            </>
          )}
          {editable && (
            <div className="detail-meta-edit">
              <TaskMetaFields value={value} onChange={setValue} errors={errors} />
            </div>
          )}
          <FormErrors errors={[...(errors.detail ?? []), ...(errors.non_field_errors ?? [])]} />
          {editable && (
            <div className="actions">
              {canDelete(me, task) && (
                <button type="button" className="btn btn-danger" onClick={remove}>{t('board.delete')}</button>
              )}
              <button className="btn btn-primary" disabled={busy} data-testid="detail-save">{t('board.save')}</button>
            </div>
          )}
        </form>
        <Comments task={task} me={me} onCountChange={() => setDirtyComments(true)} />
        </div>

        <aside className="detail-side">
          {me.role === 'teacher' && task.from_teacher && task.status === 'review' && (
            <div className="review-actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => run(() => moveTask(task.id, 'done', END))}
                data-testid="accept">{t('board.accept')}</button>
              <button className="btn" disabled={busy} onClick={() => setReturnTo('in_progress')}
                data-testid="return">{t('board.return')}</button>
            </div>
          )}
          <Field label={t('board.status')}>
            <select value={task.status} onChange={(e) => changeStatus(e.target.value as TaskStatus)}
              disabled={statuses.length < 2 || busy} data-testid="detail-status">
              {statuses.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
            </select>
          </Field>
          <div className="side-row">
            <span className="field-label">{t('board.assignee')}</span>
            <Link className="user-link side-user" to={`/users/${task.owner.id}`} onClick={onClose}>
              <Avatar author={task.owner} size="sm" /> {fullName(task.owner)}
            </Link>
          </div>
          <div className="side-row">
            <span className="field-label">{t('board.author')}</span>
            <span>{task.from_teacher ? `${t('board.from_teacher')}: ${fullName(task.created_by)}` : t('board.personal')}</span>
          </div>
          {!editable && (
            <>
              <div className="side-row">
                <span className="field-label">{t('board.priority')}</span>
                <span className="side-inline"><PriorityIcon priority={task.priority} /> {t(`priority.${task.priority}`)}</span>
              </div>
              <div className="side-row">
                <span className="field-label">{t('board.estimate')}</span><span>{task.estimate ?? '—'}</span>
              </div>
              <div className="side-row">
                <span className="field-label">{t('board.deadline')}</span>
                <span className={task.is_overdue ? 'deadline overdue' : ''}>
                  {task.deadline ? formatDay(task.deadline, i18n.language, true) : '—'}
                </span>
              </div>
              {task.labels.length > 0 && (
                <div className="side-row">
                  <span className="field-label">{t('board.labels')}</span>
                  <Labels labels={task.labels} />
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {returnTo && (
        <ReturnDialog onCancel={() => setReturnTo(null)} onConfirm={(text) => {
          const to = returnTo
          setReturnTo(null)
          run(async () => {
            if (text.trim()) await addComment(task.id, text.trim())
            await moveTask(task.id, to, END)
          })
        }} />
      )}
    </Modal>
  )
}
