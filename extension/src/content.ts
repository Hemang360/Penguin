import { getDomPath } from './utils/domPath'

let sessionId = crypto.randomUUID()
let enabled = true

chrome.storage?.local?.get(['cdna-enabled'], (res) => {
  enabled = res['cdna-enabled'] ?? true
})

function sendEvent(data: any) {
  if (!enabled) return
  try {
    chrome.runtime.sendMessage({ type: 'CDNA_CAPTURE', data })
  } catch {}
}

function captureInput(el: HTMLTextAreaElement | HTMLInputElement) {
  const path = getDomPath(el)
  const payload = {
    sessionId,
    url: location.href,
    text: el.value,
    path,
    ts: Date.now(),
  }
  sendEvent({ kind: 'input', payload })
}

document.addEventListener('input', (e) => {
  const target = e.target as HTMLTextAreaElement | HTMLInputElement
  if (!target) return
  if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
    captureInput(target)
  }
}, { passive: true })

document.addEventListener('keydown', (e) => {
  if ((e as KeyboardEvent).key === 'Enter' && !(e as KeyboardEvent).shiftKey) {
    const active = document.activeElement as HTMLTextAreaElement | HTMLInputElement
    if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT')) {
      const path = getDomPath(active)
      sendEvent({ kind: 'submit', payload: { sessionId, url: location.href, text: active.value, path, ts: Date.now() } })
    }
  }
})


