/**
 * AuthContext — provides user session state and auth actions throughout the app.
 * JWT stored in localStorage under "rubli_jwt".
 * On mount, validates an existing token via GET /auth/me; clears on 401.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiLogin, apiRegister, apiMe, type User } from '@/lib/auth-api'

const JWT_KEY = 'rubli_jwt'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(JWT_KEY))
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // On mount: if a stored token exists, validate it
  useEffect(() => {
    const stored = localStorage.getItem(JWT_KEY)
    if (!stored) {
      setIsLoading(false)
      return
    }
    apiMe(stored)
      .then((me) => {
        setUser(me)
        setToken(stored)
      })
      .catch(() => {
        // Token invalid or expired — clear it silently
        localStorage.removeItem(JWT_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    localStorage.setItem(JWT_KEY, data.access_token)
    setToken(data.access_token)
    setUser(data.user)
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await apiRegister(email, password, name)
    localStorage.setItem(JWT_KEY, data.access_token)
    setToken(data.access_token)
    setUser(data.user)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(JWT_KEY)
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
