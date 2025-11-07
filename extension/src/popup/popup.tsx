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
  :root {
    --purple-dark: #4A148C; /* Deep Purple */
    --purple-main: #673AB7; /* Main Purple */
    --purple-light: #B39DDB; /* Light Purple */
    --text-color-dark: #333333;
    --text-color-light: #FFFFFF;
    --success-color: #4CAF50;
    --danger-color: #F44336;
    --info-color: #3F51B5;
    --font-stack: 'Inter', sans-serif;
  }
  
  body {
    font-family: var(--font-stack);
    width: 440px; /* Slightly reduced width */
    padding: 22px;
    /* Gradient Background: Dark to Light Purple */
    background: linear-gradient(135deg, var(--purple-dark) 0%, var(--purple-main) 60%, var(--purple-light) 100%);
    color: var(--text-color-light); /* White text color for the background */
    border-radius: 16px; /* More rounded corners */
    box-shadow: 0 10px 18px rgba(0,0,0,0.25);
    min-height: 720px; /* Increased height */
  }
  
  h2 {
    color: var(--text-color-light); 
    border-bottom: 2px solid var(--purple-light);
    padding-bottom: 8px;
    margin-top: 0;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    text-align: center;
  }
  
  button {
    padding: 12px;
    border: none;
    border-radius: 10px; 
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  button:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-2px);
    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.18);
  }

  #start-button {
    background-color: var(--success-color);
    color: white;
    background-image: linear-gradient(to bottom right, #66BB6A, var(--success-color));
  }
  
  #stop-button {
    background-color: var(--danger-color);
    color: white;
    background-image: linear-gradient(to bottom right, #E57373, var(--danger-color));
  }
  
  button:disabled {
    background-color: #CCCCCC;
    color: #666;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
    background-image: none;
  }

  .status-area {
    padding: 15px;
    margin-top: 20px;
    border-radius: 14px;
    background-color: rgba(255, 255, 255, 0.95);
    color: var(--text-color-dark);
    text-align: left;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  }

  .dynamic-text {
    font-size: 0.9em;
    color: var(--purple-dark);
    margin-top: 5px;
    font-weight: 500;
  }

  .json-display-container {
      margin-top: 15px;
  }

  .json-display-container p {
      color: white;
      font-weight: 600;
  }

  .json-display {
    margin-top: 5px;
    padding: 12px;
    background-color: rgba(255, 255, 255, 0.95);
    border-radius: 10px;
    font-family: monospace;
    font-size: 10px;
    word-break: break-word;
    display: block;
    min-height: 220px; /* Increased display height */
    max-height: 520px; /* More room */
    overflow: auto;
    color: var(--text-color-dark);
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
    white-space: pre-wrap; /* Preserve new lines */
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 15px;
  }

  .button-group button {
    flex: 1 1 auto;
  }

  .secondary-button-group {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
  }

  .secondary-button-group button {
    flex: 1;
  }

  .copy-button {
    background-color: var(--info-color) !important;
    color: white;
    width: 100%;
    margin-top: 12px;
    background-image: linear-gradient(to bottom right, #7986CB, var(--info-color));
    border-radius: 10px;
  }

  .send-button {
    background-color: #FF9800 !important;
    color: white;
    /* width: 100%; */
    margin-top: 10px;
    background-image: linear-gradient(to bottom right, #FFB74D, #FF9800);
    border-radius: 10px;
  }

  .switch-button {
    background-color: #03A9F4 !important; /* A nice blue */
    color: white;
    margin-top: 10px;
    background-image: linear-gradient(to bottom right, #4FC3F7, #03A9F4);
    border-radius: 10px;
  }

  .pause-resume-button {
    background-color: #FFC107 !important; /* Amber color */
    color: #333;
    background-image: linear-gradient(to bottom right, #FFD54F, #FFC107);
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
        <>
            <style>{style}</style>
            <h2>Proof-of-Art</h2>
            <div className="button-group">
                <button 
                    id="start-button" 
                    onClick={() => toggleCapture(true)}
                    disabled={state.isCapturing}
                >
                    Start Monitoring
                </button>
                <button 
                    id="stop-button" 
                    onClick={() => toggleCapture(false)}
                    disabled={!state.isCapturing}
                >
                    Stop Monitoring
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
                <p>Status: <strong>{state.statusMessage}</strong></p>
                <p className="dynamic-text">Detail: {state.dynamicDetail}</p>
            </div>

            <div className="json-display-container">
                <p style={{marginTop: '15px'}}>Session Interactions:</p>
                <code className="json-display">
                    {state.sessionInteractions.map((interaction, index) => (
                        `// --- Interaction ${index + 1} ---\n${pretty(interaction)}\n\n`
                    )).join('')}
                    {`// --- Current Interaction ---\n${state.latestInteractionText}`}
                </code>
                <div className="secondary-button-group">
                    <button
                        onClick={sendToServer}
                        disabled={state.latestInteractionText === "No interaction captured." && state.sessionInteractions.length === 0}
                        className="send-button"
                    >
                        Send Session
                    </button>
                    <button
                        onClick={handleSwitchModel}
                        disabled={!state.isCapturing || state.isPaused || state.latestInteractionText === "No interaction captured."}
                        className="switch-button"
                    >
                        Switch Model
                    </button>
                </div>
            </div>
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement as HTMLElement).render(<App />);
}