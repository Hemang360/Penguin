import React, { useState, useEffect } from 'react';
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
}

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

  .copy-button {
    background-color: var(--info-color) !important;
    color: white;
    width: 100%;
    margin-top: 12px;
    background-image: linear-gradient(to bottom right, #7986CB, var(--info-color));
    border-radius: 10px;
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
        latestInteractionText: "No interaction captured."
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

        chrome.storage.local.get(['isCapturing', 'latestInteraction'], (result: StorageData) => {
            const initialCapturing = result.isCapturing || false;
            const latestText = result.latestInteraction ? pretty(result.latestInteraction) : "No interaction captured.";
            setState(s => ({ 
                ...s,
                isCapturing: initialCapturing,
                ...getStatusDetails(initialCapturing),
                latestInteractionText: latestText
            }));
        });
        
        const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
            if (namespace !== 'local') return;

            setState(s => {
                let newState = { ...s };

                if (changes.isCapturing) {
                    const newCapturingState = changes.isCapturing.newValue as boolean;
                    newState.isCapturing = newCapturingState;
                    const details = getStatusDetails(newCapturingState);
                    newState.statusMessage = details.statusMessage;
                    newState.dynamicDetail = details.dynamicDetail;
                }

                if (changes.latestInteraction) {
                    const li = changes.latestInteraction.newValue;
                    newState.latestInteractionText = pretty(li);
                    if (newState.isCapturing) {
                        newState.dynamicDetail = `New interaction from: ${li?.url || ''}`.trim();
                    }
                }
                
                return newState;
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

    const copyJson = () => {
        const text = state.latestInteractionText;
        if (text && text !== "No interaction captured.") {
            const tempInput = document.createElement('textarea');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            let success = false;
            try { success = document.execCommand('copy'); } catch {}
            document.body.removeChild(tempInput);
            setState(s => ({ ...s, dynamicDetail: success ? "JSON copied to clipboard!" : "Copy failed." }));
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
            </div>
            
            <div className="status-area">
                <p>Status: <strong>{state.statusMessage}</strong></p>
                <p className="dynamic-text">Detail: {state.dynamicDetail}</p>
            </div>

            <div className="json-display-container">
                <p style={{marginTop: '15px'}}>Latest Interaction JSON:</p>
                <code className="json-display">
                    {state.latestInteractionText}
                </code>
                <button 
                    onClick={copyJson}
                    disabled={state.latestInteractionText === "No interaction captured."}
                    className="copy-button"
                >
                    Copy JSON
                </button>
            </div>
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement as HTMLElement).render(<App />);
}