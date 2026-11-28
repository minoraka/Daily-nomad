import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGroupStudents } from '../api/endpoints'
import type { Author, Group } from '../api/types'
import { fullName } from './Avatar'

export function GroupSwitcher({ groups, value, onChange }: {
  groups: Group[] | null
  value: number | null
  onChange: (id: number) => void
}) {
  const { t } = useTranslation()
  return (
    <select aria-label={t('group.label')} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}
      data-testid="group-switcher">
      {groups?.map((g) => <option key={g.id} value={g.id}>{t('group.label')}: {g.name}</option>)}
    </select>
  )
}

export function StudentFilter({ groupId, value, onChange }: {
  groupId: number | null
  value: number | null
  onChange: (id: number | null) => void
}) {
  const { t } = useTranslation()
  const [students, setStudents] = useState<Author[]>([])
  useEffect(() => {
    if (groupId) getGroupStudents(groupId).then(setStudents, () => setStudents([]))
  }, [groupId])
  return (
    <select aria-label={t('board.all_students')} value={value ?? ''} data-testid="student-filter"
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
      <option value="">{t('board.all_students')}</option>
      {students.map((s) => <option key={s.id} value={s.id}>{fullName(s)}</option>)}
    </select>
  )
}
