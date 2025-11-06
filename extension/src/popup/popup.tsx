import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

declare var chrome: any; 

interface CapturedPath {
    path: string;
    url: string;
    timestamp: string;
}

interface ExtensionState {
    isCapturing: boolean;
    statusMessage: string;
    dynamicDetail: string;
    latestPath: string; 
}

const style = `
  :root {
    --purple-main: #673AB7; 
    --purple-light: #9575CD;
    --text-color: #333333;
    --bg-color: #F8F4FF;
    --success-color: #4CAF50;
    --danger-color: #F44336;
    --info-color: #3F51B5;
    --font-stack: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
  }
  
  body {
    font-family: var(--font-stack);
    width: 300px;
    padding: 15px;
    background-color: var(--bg-color);
    color: var(--text-color);
  }
  
  h2 {
    color: var(--purple-main);
    border-bottom: 2px solid var(--purple-light);
    padding-bottom: 5px;
    margin-top: 0;
    font-weight: 700;
  }
  
  button {
    padding: 10px;
    border: none;
    border-radius: 8px; 
    cursor: pointer;
    font-weight: bold;
    transition: all 0.2s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  button:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.15);
  }

  #start-button {
    background-color: var(--success-color);
    color: white;
  }
  
  #stop-button {
    background-color: var(--danger-color);
    color: white;
  }
  
  button:disabled {
    background-color: #CCCCCC;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  .status-area {
    padding: 12px;
    margin-top: 15px;
    border-radius: 8px;
    background-color: white;
    border: 1px solid var(--purple-light);
    text-align: left;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .dynamic-text {
    font-size: 0.9em;
    color: #666;
    margin-top: 5px;
  }

  .path-display {
    margin-top: 5px;
    padding: 10px;
    background-color: #f1f1f1;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.8em;
    word-break: break-all;
    display: block;
    min-height: 20px;
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    margin-top: 15px;
  }

  .button-group button {
    width: 48%;
  }

  .copy-button {
    background-color: var(--info-color) !important;
    color: white;
    width: 100%;
    margin-top: 8px;
  }
`;

const App: React.FC = () => {
    const getStatusDetails = (isCapturing: boolean, latestPath: string) => ({
        statusMessage: isCapturing ? "Monitoring Active 🟢" : "Monitoring Stopped 🛑",
        dynamicDetail: isCapturing ? "Click on the page to capture a DOM path." : "Click Start to begin monitoring clicks.",
        latestPath: latestPath 
    });

    const [state, setState] = useState<ExtensionState>({
        isCapturing: false,
        statusMessage: "Loading...",
        dynamicDetail: "Waiting for extension state.",
        latestPath: "No path captured." 
    });


    useEffect(() => {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            setState(s => ({ ...s, statusMessage: "Chrome API Error 🔴", dynamicDetail: "Not running as extension." }));
            return;
        }

        chrome.storage.local.get(['isCapturing', 'latestPath'], (result: any) => {
            const initialCapturing = result.isCapturing || false;
            const pathText = result.latestPath?.path || "No path captured.";
            
            setState(s => ({ 
                ...s,
                isCapturing: initialCapturing,
                ...getStatusDetails(initialCapturing, pathText)
            }));
        });
        
        const pathListener = (changes: any, namespace: string) => {
            if (namespace !== 'local') return;

            setState(s => {
                let newState = { ...s };

                if (changes.isCapturing) {
                    const newCapturingState = changes.isCapturing.newValue;
                    newState.isCapturing = newCapturingState;
                    const details = getStatusDetails(newCapturingState, newState.latestPath);
                    newState.statusMessage = details.statusMessage;
                    newState.dynamicDetail = details.dynamicDetail;
                }

                if (changes.latestPath) {
                    const newPath: CapturedPath = changes.latestPath.newValue;
                    newState.latestPath = newPath.path;
                    if (newState.isCapturing) {
                        newState.dynamicDetail = `New path captured from: ${newPath.url.substring(0, 40)}...`;
                    }
                }
                
                return newState;
            });
        };

        chrome.storage.onChanged.addListener(pathListener);

        return () => {
            chrome.storage.onChanged.removeListener(pathListener);
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
        }, (response: any) => {
            if (!response || !response.success) {
                console.error("Toggle failed:", chrome.runtime.lastError || (response && response.error));
                chrome.storage.local.get('isCapturing', (result: { isCapturing: boolean; }) => {
                    const errorDetail = response?.error || "Check console for errors. State reverted.";
                    setState(prev => ({ 
                        ...prev, 
                        isCapturing: result.isCapturing || false,
                        statusMessage: "Action Failed 🔴", 
                        dynamicDetail: errorDetail
                    }));
                });
            }
        });
    };

    const copyPath = () => {
        const path = state.latestPath;
        if (path && path !== "No path captured.") {
            const tempInput = document.createElement('textarea');
            tempInput.value = path;
            document.body.appendChild(tempInput);
            tempInput.select();
            
            let success = false;
            try {
                success = document.execCommand('copy');
            } catch (err) {
                console.error('Copy failed using execCommand:', err);
            }
            
            document.body.removeChild(tempInput);

            if (success) {
                setState(s => ({ ...s, dynamicDetail: "Path copied to clipboard!" }));
                setTimeout(() => {
                    const { dynamicDetail: revertDetail } = getStatusDetails(state.isCapturing, state.latestPath);
                    setState(s => ({ ...s, dynamicDetail: revertDetail }));
                }, 2000); 
            } else {
                 setState(s => ({ ...s, dynamicDetail: "Copy failed. Cannot access clipboard." }));
            }
        }
    };


    return (
        <>
            <style>{style}</style>
            <h2>DOM Path Capture</h2>
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

            <div className="path-display-container">
                <p style={{marginTop: '15px'}}><strong>Last Captured Path:</strong></p>
                <code className="path-display">
                    {state.latestPath}
                </code>
                 <button 
                    onClick={copyPath}
                    disabled={state.latestPath === "No path captured."}
                    className="copy-button"
                >
                    Copy Path
                </button>
            </div>
        </>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement as HTMLElement).render(<App />);
}