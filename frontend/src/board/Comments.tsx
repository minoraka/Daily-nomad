import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { fieldErrors } from '../api/client'
import { addComment, deleteComment, listComments } from '../api/endpoints'
import type { Comment, Me, Task } from '../api/types'
import { bishkekToday, formatDay } from '../i18n/format'
import { Avatar, fullName } from '../layout/Avatar'
import { FormErrors } from '../layout/Field'
import { canComment } from './policy'

function when(iso: string, lang: string): string {
  const d = new Date(iso)
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bishkek' }).format(d)
  const time = new Intl.DateTimeFormat('ru', { timeZone: 'Asia/Bishkek', hour: '2-digit', minute: '2-digit' }).format(d)
  return day === bishkekToday() ? time : `${formatDay(day, lang)} ${time}`
}

export function Comments({ task, me, onCountChange }: { task: Task; me: Me; onCountChange?: (n: number) => void }) {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<Comment[] | null>(null)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listComments(task.id).then(setItems, () => setItems([]))
  }, [task.id])

  const update = (next: Comment[]) => {
    setItems(next)
    onCountChange?.(next.length)
  }

  async function send(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setErrors([])
    try {
      update([...(items ?? []), await addComment(task.id, text)])
      setText('')
    } catch (err) {
      const fe = fieldErrors(err)
      setErrors([...(fe.text ?? []), ...(fe.detail ?? [])])
    } finally {
      setBusy(false)
    }
  }

  async function remove(c: Comment) {
    await deleteComment(c.id)
    update((items ?? []).filter((x) => x.id !== c.id))
  }

  return (
    <section className="comments" data-testid="comments">
      <h3>{t('comments.title')}</h3>
      {items?.length === 0 && <div className="muted small">{t('comments.empty')}</div>}
      {items?.map((c) => (
        <div key={c.id} className="comment" data-testid="comment">
          <Avatar author={c.author} size="sm" />
          <div className="comment-body">
            <div className="comment-head">
              <strong>{fullName(c.author)}</strong>
              {c.author.role === 'teacher' && <span className="badge badge-review">{t('role.teacher')}</span>}
              <span className="muted">{when(c.created_at, i18n.language)}</span>
              {c.can_delete && (
                <button className="link-btn" onClick={() => remove(c)}>{t('comments.delete')}</button>
              )}
            </div>
            <div className="pre">{c.text}</div>
          </div>
        </div>
      ))}
      {canComment(me, task) && (
        <form className="comment-form" onSubmit={send}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t('comments.placeholder')}
            maxLength={2000} rows={2} data-testid="comment-input" />
          <FormErrors errors={errors} />
          <div className="actions">
            <button className="btn btn-primary btn-sm" disabled={busy || !text.trim()} data-testid="comment-send">
              {t('comments.send')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
