import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../api/types'
import { Avatar, fullName } from '../layout/Avatar'
import { cardId } from './ordering'

export function TaskCardView({ task, mine, className = '', showOwner = true }: {
  task: Task
  mine: boolean
  className?: string
  showOwner?: boolean
}) {
  return (
    <div className={`task-card ${mine ? 'mine' : ''} ${className}`}>
      <div className="t-title">{task.title}</div>
      {showOwner && (
        <div className="t-owner">
          <Avatar author={task.owner} size="sm" />
          <span>{fullName(task.owner)}</span>
        </div>
      )}
    </div>
  )
}

export function SortableTaskCard({ task, mine, draggable, showOwner, onOpen }: {
  task: Task
  mine: boolean
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
      {...attributes} {...listeners} onClick={() => onOpen(task)} data-testid={`task-${task.id}`}>
      <TaskCardView task={task} mine={mine} showOwner={showOwner}
        className={`${draggable ? 'draggable' : ''} ${isDragging ? 'dragging' : ''}`} />
    </div>
  )
}
