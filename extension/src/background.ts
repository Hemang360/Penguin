const API = 'http://localhost:8787/ext/push'

// receive events from content via window.postMessage bridged by chrome.scripting if needed
self.addEventListener('message', (event: any) => {
  /* no-op in MV3 service worker */
})

// Relay window messages from content to backend
chrome.runtime.onMessage.addListener((msg, _sender, _sendResponse) => {
  if (msg?.type === 'CDNA_CAPTURE') {
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg.data)
    }).catch(() => {})
  }
})

// Inject a bridge to forward window.postMessage to runtime
chrome.runtime.onInstalled.addListener(() => {
  // no-op
})


