import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { useAuthStore } from '../store/authStore'

function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen')
      return
    }
    if (password.length < 8) {
      setError('Wachtwoord moet minimaal 8 tekens bevatten')
      return
    }

    setIsLoading(true)
    try {
      const data = await register(email, password)
      setAuth(data.access_token, data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Registratie mislukt. Probeer het opnieuw.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            color: '#1a1a2e',
            marginBottom: '8px',
            fontSize: '2rem',
            fontWeight: 700,
          }}
        >
          VoxNote
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '32px', fontSize: '0.9rem' }}>
          Maak een nieuw account aan
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}
            >
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="uw@email.nl"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#1a1a2e')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}
            >
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Minimaal 8 tekens"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#1a1a2e')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="confirmPassword"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}
            >
              Bevestig wachtwoord
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Herhaal uw wachtwoord"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#1a1a2e')}
              onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '0.875rem',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '11px',
              backgroundColor: '#1a1a2e',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {isLoading ? 'Account aanmaken...' : 'Registreer'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.875rem', color: '#64748b' }}>
          Al een account?{' '}
          <Link to="/login" style={{ color: '#1a1a2e', fontWeight: 600, textDecoration: 'none' }}>
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  )
}

export default RegisterPage
