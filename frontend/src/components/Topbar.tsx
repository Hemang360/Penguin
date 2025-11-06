import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { useAuth } from '../contexts/AuthContext'

export default function Topbar() {
  const navigate = useNavigate()
  const { isAuthenticated, account, login, logout } = useAuth()

  const handleLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="w-full border-b border-neutral-800 bg-black/60 backdrop-blur supports-[backdrop-filter]:bg-black/40">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-sm bg-gradient-to-br from-fuchsia-500 to-cyan-500" />
          <span className="font-semibold tracking-tight">Proof-of-Art</span>
        </div>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
          >
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/verify')}
          >
            Verify
          </Button>
          {isAuthenticated ? (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-400">
                {account?.name || account?.username}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="default" size="sm" onClick={handleLogin}>
              Login with Biometrics
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
}


