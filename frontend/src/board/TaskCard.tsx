import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarDays, ChevronDown, ChevronsUp, ChevronUp, Equal, GraduationCap, MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Priority, Task } from '../api/types'
import { formatDay } from '../i18n/format'
import { Avatar, fullName } from '../layout/Avatar'
import { labelColor } from './labels'
import { cardId } from './ordering'

const PRIORITY_ICON = { critical: ChevronsUp, high: ChevronUp, medium: Equal, low: ChevronDown }

export function PriorityIcon({ priority, size = 16 }: { priority: Priority; size?: number }) {
  const { t } = useTranslation()
  const Icon = PRIORITY_ICON[priority]
  return (
    <span className={`prio prio-${priority}`} title={t(`priority.${priority}`)} aria-label={t(`priority.${priority}`)}>
      <Icon size={size} strokeWidth={2.6} />
    </span>
  )
}

export function Labels({ labels }: { labels: string[] }) {
  if (!labels.length) return null
  return (
    <div className="labels">
      {labels.map((l) => <span key={l} className={`label ${labelColor(l)}`}>{l}</span>)}
    </div>
  )
}

export function TaskCardView({ task, draggable, className = '', showOwner = true }: {
  task: Task
  draggable: boolean
  className?: string
  showOwner?: boolean
}) {
  const { t, i18n } = useTranslation()
  return (
    <div className={`task-card ${draggable ? 'mine draggable' : ''} ${className}`}>
      <div className="t-title">{task.title}</div>
      <Labels labels={task.labels} />
      <div className="t-foot">
        <PriorityIcon priority={task.priority} />
        {task.estimate != null && <span className="estimate" title={t('board.estimate')}>{task.estimate}</span>}
        {task.deadline && (
          <span className={task.is_overdue ? 'deadline overdue' : 'deadline'} title={t('board.deadline')}>
            <CalendarDays size={12} /> {formatDay(task.deadline, i18n.language)}
          </span>
        )}
        {task.comments_count > 0 && (
          <span className="comments-count" title={t('board.comments')}>
            <MessageSquare size={12} /> {task.comments_count}
          </span>
        )}
        <span className="t-key">
          {task.from_teacher && (
            <span title={t('board.from_teacher_by', { name: fullName(task.created_by) })} className="from-teacher">
              <GraduationCap size={13} />
            </span>
          )}
          {task.key}
        </span>
        {showOwner && (
          <span title={fullName(task.owner)}><Avatar author={task.owner} size="sm" /></span>
        )}
      </div>
    </div>
  )
}

export function SortableTaskCard({ task, draggable, showOwner, onOpen }: {
  task: Task
  draggable: boolean
  showOwner: boolean
  onOpen: (t: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cardId(task.id),
    disabled: !draggable,
  })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes} {...listeners} onClick={() => onOpen(task)} data-testid={`task-${task.id}`}
      data-draggable={draggable}>
      <TaskCardView task={task} draggable={draggable} showOwner={showOwner} className={isDragging ? 'dragging' : ''} />
    </div>
  )
}
