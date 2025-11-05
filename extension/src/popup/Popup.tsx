import { useEffect, useState } from 'react'

export default function Popup() {
  const [enabled, setEnabled] = useState(true)
  useEffect(() => {
    chrome.storage.local.get(['cdna-enabled'], (res) => {
      setEnabled(res['cdna-enabled'] ?? true)
    })
  }, [])
  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    chrome.storage.local.set({ 'cdna-enabled': next })
  }
  return (
    <div style={{ padding: 12, minWidth: 220 }}>
      <h3>cDNA Capture</h3>
      <label>
        <input type="checkbox" checked={enabled} onChange={toggle} /> Enable capture
      </label>
    </div>
  )
}


