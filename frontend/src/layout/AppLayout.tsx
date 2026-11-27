import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="app">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <div className="backdrop" onClick={() => setMenuOpen(false)} />}
      <div className="main">
        <Topbar onMenu={() => setMenuOpen((o) => !o)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Centered narrow column used by most pages (like the LMS). */
export function Page({ title, wide, children }: { title?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'page page-wide' : 'page'}>
      {title && <h1 className="page-title">{title}</h1>}
      {children}
    </div>
  )
}
