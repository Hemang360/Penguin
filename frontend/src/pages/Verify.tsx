import { useState } from 'react'
import { verifyByKey } from '../lib/api'
import Topbar from '../components/Topbar'

export default function Verify() {
  const [key, setKey] = useState('')
  const [result, setResult] = useState<any>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key) return
    const res = await verifyByKey(key)
    setResult(res)
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <Topbar />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">Verify</h1>
        <form onSubmit={onSubmit} className="mt-2 flex gap-2">
          <input
            value={key}
            onChange={e => setKey(e.target.value)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-gray-500"
            placeholder="/ipfs/Qm..."
          />
          <button className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg">Check</button>
        </form>
        {result && (
          <pre className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4 overflow-auto text-sm text-gray-200">{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}


