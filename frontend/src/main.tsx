import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './styles/index.css'
import Dashboard from './pages/Dashboard'
import Verify from './pages/Verify'
import Session from './pages/Session'
import NotFound from './pages/NotFound'
import Features from './pages/Features'
import FAQ from './pages/FAQ'
import { AuthProvider } from './contexts/AuthContext'
import LandingPage from './pages/LandingPage'

const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/verify', element: <Verify /> },
  { path: '/generate', element: <Dashboard /> },
  { path: '/session/:id', element: <Session /> },
  { path: '/features', element: <Features /> },
  { path: '/faq', element: <FAQ /> },
  { path: '*', element: <NotFound /> }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)


