import { useState } from 'react'
import { createNode } from '../lib/api'

export default function NodeCreator() {
  const [kind, setKind] = useState('prompt.v1')
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('{"text":"generate landscape","url":"https://example.com"}')
  const [resp, setResp] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    let parsed: any
    try { parsed = JSON.parse(body) } catch { setError('Body must be valid JSON'); return }
    setLoading(true)
    try {
      const r = await createNode(kind, author || undefined, parsed)
      setResp(r)
    } catch (err: any) {
      setError(err?.message || 'Failed to create node')
    } finally { setLoading(false) }
  }

  return (
    <div className="mt-6 border rounded p-4 bg-white shadow-sm">
      <h2 className="font-semibold">Create Test Node</h2>
      <form onSubmit={submit} className="mt-3 grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm text-slate-600">Kind</label>
          <input className="border rounded px-3 py-2" value={kind} onChange={e=>setKind(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-slate-600">Author (optional)</label>
          <input className="border rounded px-3 py-2" value={author} onChange={e=>setAuthor(e.target.value)} />
        </div>
        <div className="grid gap-1">
          <label className="text-sm text-slate-600">Body JSON</label>
          <textarea className="border rounded px-3 py-2 font-mono text-sm" rows={5} value={body} onChange={e=>setBody(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <button disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60">{loading ? 'Creating...' : 'Create'}</button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
      {resp && (
        <div className="mt-4">
          <div className="text-sm text-slate-700">Node created. You can verify with its IPFS key:</div>
          <pre className="mt-2 bg-slate-100 p-3 rounded overflow-auto text-xs">{JSON.stringify(resp, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}


