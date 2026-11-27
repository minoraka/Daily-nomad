export interface PillTab<K extends string> { key: K; label: string }

export function PillTabs<K extends string>({ tabs, value, onChange }: {
  tabs: PillTab<K>[]
  value: K
  onChange: (k: K) => void
}) {
  return (
    <div className="pill-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.key} role="tab" aria-selected={tab.key === value}
          className={tab.key === value ? 'pill-tab active' : 'pill-tab'} onClick={() => onChange(tab.key)}>
          {tab.label}
        </button>
      ))}
    </div>
  )
}
