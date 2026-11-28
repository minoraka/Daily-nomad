import {
  closestCorners, DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { STATUSES, type Task, type TaskStatus } from '../api/types'
import { cardId, columnId } from './ordering'
import { SortableTaskCard, TaskCardView } from './TaskCard'

function Column({ status, children, count, onAdd }: {
  status: TaskStatus
  count: number
  children: React.ReactNode
  onAdd?: () => void
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status) })
  return (
    <section className="column" data-testid={`column-${status}`}>
      <div className="column-head">
        <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
        <span className="count">{count}</span>
        {onAdd && (
          <button className="btn btn-sm btn-primary" onClick={onAdd} data-testid="add-task">
            <Plus size={13} /> {t('board.add_task')}
          </button>
        )}
      </div>
      <div ref={setNodeRef} className={isOver ? 'column-body over' : 'column-body'}>
        {children}
        {count === 0 && <div className="empty">{t('board.empty_column')}</div>}
      </div>
    </section>
  )
}

export function BoardColumns({ tasks, canEdit, onDrop, onOpen, onAdd, showOwner = true }: {
  tasks: Task[]
  canEdit: (t: Task) => boolean
  onDrop: (task: Task, overId: string) => void
  onOpen: (t: Task) => void
  onAdd?: () => void
  showOwner?: boolean
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const [active, setActive] = useState<Task | null>(null)

  const onStart = (e: DragStartEvent) => setActive(tasks.find((t) => cardId(t.id) === e.active.id) ?? null)
  const onEnd = (e: DragEndEvent) => {
    setActive(null)
    const task = tasks.find((t) => cardId(t.id) === e.active.id)
    if (task && e.over) onDrop(task, String(e.over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onStart} onDragEnd={onEnd}
      onDragCancel={() => setActive(null)}>
      <div className="board">
        {STATUSES.map((status) => {
          const col = tasks.filter((t) => t.status === status)
          return (
            <Column key={status} status={status} count={col.length} onAdd={status === 'todo' ? onAdd : undefined}>
              <SortableContext items={col.map((t) => cardId(t.id))} strategy={verticalListSortingStrategy}>
                {col.map((t) => (
                  <SortableTaskCard key={t.id} task={t} mine={canEdit(t)} draggable={canEdit(t)} showOwner={showOwner}
                    onOpen={onOpen} />
                ))}
              </SortableContext>
            </Column>
          )
        })}
      </div>
      <DragOverlay>{active && <TaskCardView task={active} mine showOwner={showOwner} className="overlay" />}</DragOverlay>
    </DndContext>
  )
}
