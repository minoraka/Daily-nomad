import type { Author } from '../api/types'

export function Avatar({ author, size = 'md' }: { author: Author; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {author.initials}
    </span>
  )
}

export const fullName = (a: Author) => `${a.last_name} ${a.first_name}`.trim()
