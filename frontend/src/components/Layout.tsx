import { type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          backgroundColor: '#1a1a2e',
          color: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Link
          to="/dashboard"
          style={{
            color: '#fff',
            textDecoration: 'none',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '-0.5px',
          }}
        >
          VoxNote
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/dashboard"
            style={{
              color: '#ccc',
              textDecoration: 'none',
              fontSize: '0.95rem',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = '#ccc')}
          >
            Dashboard
          </Link>
          {user && (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>{user.email}</span>
          )}
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #555',
              color: '#ccc',
              padding: '6px 14px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              const btn = e.target as HTMLButtonElement
              btn.style.borderColor = '#fff'
              btn.style.color = '#fff'
            }}
            onMouseLeave={(e) => {
              const btn = e.target as HTMLButtonElement
              btn.style.borderColor = '#555'
              btn.style.color = '#ccc'
            }}
          >
            Uitloggen
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '32px 24px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {children}
      </main>

      <footer
        style={{
          backgroundColor: '#1a1a2e',
          color: '#666',
          textAlign: 'center',
          padding: '16px',
          fontSize: '0.8rem',
        }}
      >
        VoxNote &copy; {new Date().getFullYear()} — Voice recordings, transcribed and summarized.
      </footer>
    </div>
  )
}

export default Layout
