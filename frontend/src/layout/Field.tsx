import type { ReactNode } from 'react'

export function Field({ label, errors, children }: { label: string; errors?: string[]; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {errors?.map((e) => (
        <span key={e} className="field-error">{e}</span>
      ))}
    </label>
  )
}

export function FormErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null
  return <div className="form-error">{errors.join(' ')}</div>
}
