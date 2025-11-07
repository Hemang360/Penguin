import { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

declare var chrome: any; 

interface CapturedPath {
    path: string;
    url: string;
    timestamp: string;
}

interface StorageData {
    isCapturing?: boolean; 
    latestPath?: CapturedPath;
    latestInteraction?: any;
}

interface ToggleResponse {
    success: boolean;
    error?: string;
}

interface ExtensionState {
    isCapturing: boolean;
    statusMessage: string;
    dynamicDetail: string;
    latestInteractionText: string; 
    isPaused: boolean;
    sessionInteractions: any[];
}

const API_BASE = 'http://localhost:8787';

const style = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');

  :root {
    --bg-black: #0a0a0a;
    --bg-neutral-900: #171717;
    --border-neutral-800: #262626;
    --text-gray-100: #f3f4f6;
    --text-gray-400: #9ca3af;
    --fuchsia-500: #d946ef;
    --cyan-500: #06b6d4;
    --font-sans: 'DM Sans', sans-serif;
  }
  
  body {
    font-family: var(--font-sans);
    width: 550px;
    height: 550px; /* Optimized height */
    background-color: var(--bg-black);
    color: var(--text-gray-100);
    margin: 0;
    overflow: hidden; /* Prevents the whole extension from scrolling */
  }

  .app-container {
    padding: 20px;
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
  }
  
  h2 {
    color: var(--text-gray-100); 
    border-bottom: 1px solid var(--border-neutral-800);
    padding-bottom: 10px;
    margin-top: 0;
    margin-bottom: 12px;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    text-align: center;
    font-size: 22px;
    background: linear-gradient(to right, var(--fuchsia-500), var(--cyan-500));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  
  button {
    padding: 10px 12px;
    border: 1px solid var(--border-neutral-800);
    border-radius: 8px; 
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    font-size: 14px;
    background-color: var(--bg-neutral-900);
    color: var(--text-gray-100);
  }
  
  button:hover:not(:disabled) {
    border-color: var(--cyan-500);
    color: var(--cyan-500);
  }

  .button-primary {
    background-image: linear-gradient(to right, var(--fuchsia-500), var(--cyan-500));
    color: white;
    border: none;
  }

  .button-primary:hover:not(:disabled) {
    opacity: 0.9;
    color: white;
    border: none;
  }

  #start-button:not(:disabled):hover {
    color: #4ade80;
    border-color: #4ade80;
  }

  #stop-button:not(:disabled):hover {
    color: #f87171;
    border-color: #f87171;
  }

  .pause-resume-button:not(:disabled):hover {
    color: #fbbf24;
    border-color: #fbbf24;
  }
  
  button:disabled {
    background: var(--bg-neutral-900);
    border-color: var(--border-neutral-800);
    color: #4b5563; /* gray-600 */
    cursor: not-allowed;
  }

  .status-area {
    padding: 10px;
    margin-top: 12px;
    border-radius: 8px;
    background-color: var(--bg-neutral-900);
    border: 1px solid var(--border-neutral-800);
    color: var(--text-gray-100);
    text-align: left;
    font-size: 14px;
  }

  .dynamic-text {
    font-size: 12px;
    color: var(--text-gray-400);
    margin-top: 4px;
  }

  .json-display-container {
    margin-top: 2px;
    flex-grow: 1; /* This is key for the layout */
    display: flex;
    flex-direction: column;
    min-height: 0; /* This is a flexbox trick to make scrolling work */
  }

  .json-display-container p {
      color: var(--text-gray-400);
      font-weight: 500;
      margin-bottom: 8px;
      font-size: 14px;
  }

  .json-display {
    padding: 12px;
    background-color: var(--bg-neutral-900);
    border: 1px solid var(--border-neutral-800);
    border-radius: 8px;
    font-family: monospace;
    font-size: 11px;
    word-break: break-word;
    overflow-y: auto; /* Makes ONLY this element scrollable */
    flex-grow: 1;
    color: var(--text-gray-100);
    white-space: pre-wrap;
  }

  .button-group {
    display: flex;
    gap: 8px;
  }

  .button-group button {
    flex: 1;
  }

  .bottom-actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-shrink: 0; /* Prevents this container from shrinking */
  }

  .bottom-actions button {
    flex: 1;
  }
`;

const App: React.FC = () => {
    const getStatusDetails = (isCapturing: boolean) => ({
        statusMessage: isCapturing ? "Monitoring Active 🟢" : "Monitoring Stopped 🛑",
        dynamicDetail: isCapturing ? "Capturing latest prompt/output + media." : "Click Start to begin monitoring."
    });

    const [state, setState] = useState<ExtensionState>({
        isCapturing: false,
        statusMessage: "Loading...",
        dynamicDetail: "Waiting for extension state.",
        latestInteractionText: "No interaction captured.",
        isPaused: false,
        sessionInteractions: [],
    });

    const orderKeys = (obj: any) => {
        if (!obj || typeof obj !== 'object') return obj;
        const ordered: any = {};
        const keys = ['url','input','output','modal-version','timestamp'];
        keys.forEach(k => { if (obj[k] !== undefined) ordered[k] = obj[k]; });
        // Append any other fields deterministically
        Object.keys(obj).sort().forEach(k => {
            if (!(k in ordered)) ordered[k] = obj[k];
        });
        return ordered;
    };

    const pretty = (obj: any) => {
        try { return JSON.stringify(orderKeys(obj), null, 2); } catch { return String(obj ?? ''); }
    };

    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            setState(s => ({ ...s, statusMessage: "Chrome API Error 🔴", dynamicDetail: "Not running as extension." }));
            return;
        }

        chrome.storage.local.get(['isCapturing', 'latestInteraction', 'isPaused'], (result: StorageData & { isPaused?: boolean }) => {
            const initialCapturing = result.isCapturing || false;
            const initialPaused = result.isPaused || false;
            const latestText = result.latestInteraction ? pretty(result.latestInteraction) : "No interaction captured.";
            
            let dynamicDetail = getStatusDetails(initialCapturing).dynamicDetail;
            if (initialPaused) {
                dynamicDetail = "Session is paused. Click Resume to continue monitoring.";
            }

            setState(s => ({ 
                ...s,
                isCapturing: initialCapturing,
                isPaused: initialPaused,
                statusMessage: getStatusDetails(initialCapturing).statusMessage,
                dynamicDetail: dynamicDetail,
                latestInteractionText: latestText
            }));
        });
        
        const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
            if (namespace !== 'local') return;

            // This listener will now react to all storage changes and update the state accordingly.
            chrome.storage.local.get(['isCapturing', 'latestInteraction', 'isPaused', 'sessionInteractions'], (result: StorageData & { isPaused?: boolean, sessionInteractions?: any[] }) => {
                setState(s => {
                    const newCapturing = result.isCapturing ?? s.isCapturing;
                    const newPaused = result.isPaused ?? s.isPaused;
                    const newInteractions = result.sessionInteractions ?? s.sessionInteractions;

                    let newLatestText = s.latestInteractionText;
                    if (result.latestInteraction) {
                        const latestInteractionStr = pretty(result.latestInteraction);
                        // Only update if it's different, to avoid loops
                        if (latestInteractionStr !== s.latestInteractionText) {
                            newLatestText = latestInteractionStr;
                        }
                    }
                    
                    // If we are paused, the text should reflect that state.
                    if (newPaused && s.isPaused !== newPaused) {
                        newLatestText = "Ready for next model. Click 'Resume' to continue.";
                    }

                    const statusDetails = getStatusDetails(newCapturing);
                    let dynamicDetail = statusDetails.dynamicDetail;
                    if (newPaused) {
                        dynamicDetail = "Session is paused. Resume to continue monitoring.";
                    } else if (changes.latestInteraction) {
                        dynamicDetail = `New interaction from: ${result.latestInteraction?.url || ''}`.trim();
                    }

                    return {
                        ...s,
                        isCapturing: newCapturing,
                        isPaused: newPaused,
                        sessionInteractions: newInteractions,
                        latestInteractionText: newLatestText,
                        statusMessage: statusDetails.statusMessage,
                        dynamicDetail: dynamicDetail,
                    };
                });
            });
        };

        chrome.storage.onChanged.addListener(storageListener);

        return () => {
            chrome.storage.onChanged.removeListener(storageListener);
        };
    }, []); 

    const toggleCapture = (shouldStart: boolean) => {
        if (typeof chrome === 'undefined' || !chrome.runtime) return;

        setState(prev => ({ 
            ...prev, 
            statusMessage: shouldStart ? "Starting..." : "Stopping...",
            dynamicDetail: shouldStart ? "Sending start command to active tab..." : "Sending stop command to active tab..."
        }));

        chrome.runtime.sendMessage({
            action: "toggleCapture",
            shouldStart: shouldStart
        }, (response: ToggleResponse) => {
            if (!response || !response.success) {
                console.error("Toggle failed:", chrome.runtime.lastError || (response && response.error));
                chrome.storage.local.get(['isCapturing','latestInteraction'], (result: StorageData) => {
                    const errorDetail = response?.error || "Check console for errors. State reverted.";
                    const latestText = result.latestInteraction ? pretty(result.latestInteraction) : state.latestInteractionText;
                    setState(prev => ({ 
                        ...prev, 
                        isCapturing: result.isCapturing || false,
                        statusMessage: "Action Failed 🔴", 
                        dynamicDetail: errorDetail,
                        latestInteractionText: latestText
                    }));
                });
            }
        });
    };

    const sendToServer = () => {
        try {
            const interactions = state.sessionInteractions.length > 0 ? state.sessionInteractions : [JSON.parse(state.latestInteractionText)];
            if (interactions.length === 0 || (interactions.length === 1 && !interactions[0])) {
                setState(s => ({ ...s, dynamicDetail: 'No interactions to send.' }));
                return;
            }

            const payload = {
                session: interactions,
                timestamp: new Date().toISOString()
            };

            setState(s => ({ ...s, dynamicDetail: 'Sending session to /ext/push...' }));
            fetch(`${API_BASE}/ext/push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(async (res) => {
                const txt = await res.text();
                if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
                setState(s => ({ ...s, dynamicDetail: 'Session sent to /ext/push ✔︎', sessionInteractions: [], latestInteractionText: "No interaction captured." }));
            }).catch(err => {
                setState(s => ({ ...s, dynamicDetail: `Send failed: ${err.message}` }));
            });
        } catch (e: any) {
            setState(s => ({ ...s, dynamicDetail: 'Invalid JSON in interactions; cannot send.' }));
        }
    };

    const handlePauseResume = () => {
        const willBePaused = !state.isPaused;
        chrome.storage.local.set({ isPaused: willBePaused });

        if (!willBePaused) {
            // If resuming, clear the "Ready for next model" message and prepare for new content.
            setState(s => ({ ...s, latestInteractionText: "Resuming... waiting for interaction." }));
            chrome.runtime.sendMessage({ action: "RESUME_CAPTURING" });
        }
    };

    const handleSwitchModel = () => {
        try {
            const currentInteraction = JSON.parse(state.latestInteractionText);
            if (currentInteraction && state.latestInteractionText !== "No interaction captured.") {
                const newSessionInteractions = [...state.sessionInteractions, currentInteraction];
                const willBePaused = true;
                
                // Update storage first
                chrome.storage.local.set({ 
                    isPaused: willBePaused, 
                    sessionInteractions: newSessionInteractions,
                    // Clear latest interaction from storage to avoid stale data
                    latestInteraction: null 
                });

                setState(s => ({
                    ...s,
                    sessionInteractions: newSessionInteractions,
                    latestInteractionText: "Ready for next model. Click 'Resume' to continue.",
                    isPaused: willBePaused, // Automatically pause
                    dynamicDetail: `Model output saved. Resume when you're ready on the new page.`
                }));
            } else {
                setState(s => ({ ...s, dynamicDetail: "No valid interaction to save before switching."}));
            }
        } catch (e) {
            setState(s => ({ ...s, dynamicDetail: "Cannot switch: current interaction is not valid JSON."}));
        }
    };

    return (
        <div className="app-container">
            <style>{style}</style>
            <h2>PengWin</h2>
            
            <div className="button-group">
                <button 
                    id="start-button" 
                    onClick={() => toggleCapture(true)}
                    disabled={state.isCapturing}
                >
                    Start
                </button>
                <button 
                    id="stop-button" 
                    onClick={() => toggleCapture(false)}
                    disabled={!state.isCapturing}
                >
                    Stop
                </button>
                <button
                    onClick={handlePauseResume}
                    disabled={!state.isCapturing}
                    className="pause-resume-button"
                >
                    {state.isPaused ? 'Resume' : 'Pause'}
                </button>
            </div>
            
            <div className="status-area">
                <p><strong>{state.statusMessage}</strong></p>
                <p className="dynamic-text">{state.dynamicDetail}</p>
            </div>

            <div className="json-display-container">
                <p>Session Interactions:</p>
                <code className="json-display">
                    {state.sessionInteractions.map((interaction, index) => (
                        `// --- Interaction ${index + 1} ---\n${pretty(interaction)}\n\n`
                    )).join('')}
                    {`// --- Current Interaction ---\n${state.latestInteractionText}`}
                </code>
            </div>

            <div className="bottom-actions">
                <button
                    onClick={sendToServer}
                    disabled={state.latestInteractionText === "No interaction captured." && state.sessionInteractions.length === 0}
                    className="button-primary"
                >
                    Send Session
                </button>
                <button
                    onClick={handleSwitchModel}
                    disabled={!state.isCapturing || state.isPaused || state.latestInteractionText === "No interaction captured."}
                    className="button-primary"
                >
                    Switch Model
                </button>
            </div>
        </div>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement as HTMLElement).render(<App />);
}