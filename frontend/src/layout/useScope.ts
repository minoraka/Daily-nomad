import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getGroups } from '../api/endpoints'
import type { Group } from '../api/types'
import { useMe } from '../auth/AuthContext'

/**
 * Selected group (?group=) and student filter (?student=) shared by Board and Dailies.
 * Default group: student's own, or the first group alphabetically for teachers.
 */
export function useScope() {
  const me = useMe()
  const [params, setParams] = useSearchParams()
  const [groups, setGroups] = useState<Group[] | null>(null)

  useEffect(() => {
    getGroups().then(setGroups, () => setGroups([]))
  }, [])

  const fromUrl = Number(params.get('group')) || null
  const groupId = fromUrl ?? me.group?.id ?? groups?.[0]?.id ?? null
  const studentId = Number(params.get('student')) || null

  const update = (patch: { group?: number; student?: number | null }) => {
    const next = new URLSearchParams(params)
    if (patch.group !== undefined) {
      next.set('group', String(patch.group))
      next.delete('student')
    }
    if (patch.student !== undefined) {
      if (patch.student) next.set('student', String(patch.student))
      else next.delete('student')
    }
    setParams(next, { replace: true })
  }

  return {
    groups,
    groupId,
    studentId,
    isOwnGroup: me.group?.id === groupId,
    setGroup: (id: number) => update({ group: id }),
    setStudent: (id: number | null) => update({ student: id }),
  }
}
