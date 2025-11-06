import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import Dashboard from './pages/Dashboard'
import Verify from './pages/Verify'
import Session from './pages/Session'
import { AuthProvider } from './contexts/AuthContext'

const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  { path: '/verify', element: <Verify /> },
  { path: '/session/:id', element: <Session /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)


