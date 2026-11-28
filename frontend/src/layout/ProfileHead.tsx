import { useTranslation } from 'react-i18next'
import type { Me } from '../api/types'
import { Avatar, fullName } from './Avatar'

export function ProfileHead({ user }: { user: Me }) {
  const { t } = useTranslation()
  return (
    <div className="profile-head card">
      <Avatar author={user} size="lg" />
      <div>
        <div className="name">{fullName(user)}</div>
        <div className="sub">{t(`role.${user.role}`)}{user.group ? ` · ${user.group.name}` : ''}</div>
      </div>
    </div>
  )
}
