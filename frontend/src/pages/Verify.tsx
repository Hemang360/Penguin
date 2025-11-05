import { useState } from 'react'
import { verifyByKey } from '../lib/api'

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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold">Verify</h1>
      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input value={key} onChange={e => setKey(e.target.value)} className="border px-3 py-2 rounded w-full" placeholder="/ipfs/Qm..." />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">Check</button>
      </form>
      {result && (
        <pre className="mt-4 bg-slate-100 p-3 rounded overflow-auto text-sm">{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  )
}


