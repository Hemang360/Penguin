import { useEffect, useState } from 'react'
import { health } from '../lib/api'
import { Link } from 'react-router-dom'
import NodeCreator from '../components/NodeCreator'

export default function Dashboard() {
  const [status, setStatus] = useState<'loading'|'ok'|'error'>('loading')

  useEffect(() => {
    health().then(() => setStatus('ok')).catch(() => setStatus('error'))
  }, [])

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Proof-of-Art (cDNA)</h1>
          <nav className="flex gap-4 text-sm">
            <Link className="text-blue-600 underline" to="/">Dashboard</Link>
            <Link className="text-blue-600 underline" to="/verify">Verify</Link>
          </nav>
        </div>
      </header>
      <main className="p-6 max-w-5xl mx-auto">
        <p className="text-slate-600">Backend: {status}</p>
        <NodeCreator />
      </main>
    </div>
  )
}


