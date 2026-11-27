import type { ReactNode } from 'react'

/** Labelled form field. Use `group` when children are several controls (buttons, chips) — a <label> may wrap only one. */
export function Field({ label, errors, children, group = false }: {
  label: string
  errors?: string[]
  children: ReactNode
  group?: boolean
}) {
  const body = (
    <>
      <span className="field-label">{label}</span>
      {children}
      {errors?.map((e) => (
        <span key={e} className="field-error">{e}</span>
      ))}
    </>
  )
  return group
    ? <div className="field" role="group" aria-label={label}>{body}</div>
    : <label className="field">{body}</label>
}

export function FormErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <div className="form-error">{errors.join(' ')}</div>
}
