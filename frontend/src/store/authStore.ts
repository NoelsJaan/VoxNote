import { create } from 'zustand'

interface User {
  id: number
  email: string
  created_at: string
}

interface AuthState {
  token: string | null
  user: User | null
  isAuthenticated: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
}

const TOKEN_KEY = 'voxnote_token'
const USER_KEY = 'voxnote_user'

// Rehydrate from localStorage on load
const storedToken = localStorage.getItem(TOKEN_KEY)
const storedUserRaw = localStorage.getItem(USER_KEY)
let storedUser: User | null = null
if (storedUserRaw) {
  try {
    storedUser = JSON.parse(storedUserRaw) as User
  } catch {
    storedUser = null
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: storedUser,
  isAuthenticated: !!storedToken && !!storedUser,

  setAuth: (token: string, user: User) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
