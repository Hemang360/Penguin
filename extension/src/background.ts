interface CapturedPath {
    path: string;
    url: string;
    timestamp: string;
    tabId: number | string;
}

interface ToggleMessage {
    action: "toggleCapture";
    shouldStart: boolean;
}

interface PathFoundMessage {
    action: "domPathFound";
    path: string;
    url: string;
}

interface SetCapturingMessage {
    action: "SET_CAPTURING";
    value: boolean;
}

interface ResumeCapturingMessage {
    action: "RESUME_CAPTURING";
}

interface ContentScriptResponse {
    success: boolean;
    error?: string;
}

interface HistoryResult {
    pathHistory?: CapturedPath[];
}

const CONTENT_SCRIPT_FILE = 'content.js';

interface InteractionPayload {
	url: string;
	input?: string;
	output: any;
	timestamp?: string;
}

let attachedTabId: number | null = null;

function enableNetworkDebugger(tabId: number) {
	if (attachedTabId === tabId) return;
	try {
		chrome.debugger.attach({ tabId }, "1.3", () => {
			if (chrome.runtime.lastError) {
				console.warn("[Background] Debugger attach failed:", chrome.runtime.lastError.message);
				return;
			}
			attachedTabId = tabId;
			chrome.debugger.sendCommand({ tabId }, "Network.enable", {});
			console.log("[Background] Network debugger enabled on tab", tabId);
		});
	} catch (e) {
		console.warn("[Background] Debugger attach error:", e);
	}
}

function disableNetworkDebugger() {
	if (attachedTabId == null) return;
	const tabId = attachedTabId;
	attachedTabId = null;
	try {
		chrome.debugger.detach({ tabId }, () => {
			console.log("[Background] Network debugger detached from tab", tabId);
		});
	} catch {}
}

chrome.debugger.onEvent.addListener((source, method, params) => {
	if (attachedTabId == null || source.tabId !== attachedTabId) return;
	if (method === 'Network.responseReceived') {
		const { response, requestId, type } = params as any;
		const mime = response?.mimeType as string | undefined;
		const url = response?.url as string | undefined;
		if (!url || !mime) return;
		const lower = mime.toLowerCase();
		const isInteresting = type === 'Image' || lower.startsWith('image/') || lower === 'application/pdf' || lower === 'text/plain' || lower === 'application/zip';
		if (!isInteresting) return;

        try {
            chrome.debugger.sendCommand({ tabId: source.tabId! }, 'Network.getResponseBody', { requestId }, (body: any) => {
                if (!body) return;
                const isBase64 = Boolean((body as any).base64Encoded);
                const raw = (body as any).body as string | undefined;
                const base64 = isBase64 ? (raw || '') : btoa(raw || '');
				chrome.storage.local.get(['recentAssets'], (res) => {
					const list = Array.isArray(res.recentAssets) ? res.recentAssets : [];
					list.unshift({ url, mime, base64 });
					if (list.length > 50) list.pop();
					chrome.storage.local.set({ recentAssets: list });
				});
			});
		} catch (e) {
			console.warn('[Background] getResponseBody failed', e);
		}
	}
});

/**
 * @param shouldStart 
 * @param tabId 
 * @returns 
 */
async function setCapturingState(shouldStart: boolean, tabId: number): Promise<ContentScriptResponse> {
    const message: SetCapturingMessage = {
        action: "SET_CAPTURING",
        value: shouldStart
    };

    try {
        const response: ContentScriptResponse = await chrome.tabs.sendMessage(tabId, message);
        
        if (response && response.success) {
            await chrome.storage.local.set({ isCapturing: shouldStart });
            console.log(`[Background] Capturing state set successfully to: ${shouldStart} in tab ${tabId}.`);
            if (shouldStart) enableNetworkDebugger(tabId); else disableNetworkDebugger();
            return { success: true };
        } else {
            await chrome.storage.local.set({ isCapturing: false });
            if (!shouldStart) disableNetworkDebugger();
            console.error("[Background] Content script responded, but failed:", response?.error);
            return { success: false, error: response?.error || "Content script failed to acknowledge SET_CAPTURING." };
        }
    } catch (e) {
        console.warn(`[Background] Failed to communicate with tab ${tabId}. Attempting to inject content script...`);

        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [CONTENT_SCRIPT_FILE]
            });
            console.log(`[Background] Content script injected into tab ${tabId}. Retrying message.`);
            
            const retryResponse: ContentScriptResponse = await chrome.tabs.sendMessage(tabId, message);

            if (retryResponse && retryResponse.success) {
                await chrome.storage.local.set({ isCapturing: shouldStart });
                console.log(`[Background] Capturing state set successfully on retry to: ${shouldStart} in tab ${tabId}.`);
                if (shouldStart) enableNetworkDebugger(tabId); else disableNetworkDebugger();
                return { success: true };
            } else {
                await chrome.storage.local.set({ isCapturing: false });
                if (!shouldStart) disableNetworkDebugger();
                console.error("[Background] Retry failed, content script responded, but failed its internal logic:", retryResponse?.error);
                return { success: false, error: retryResponse?.error || "Content script failed on retry." };
            }

        } catch (scriptingError) {
            const errorMsg = `[Background] Scripting injection failed for tab ${tabId}.`;
            console.error(errorMsg, scriptingError);
            await chrome.storage.local.set({ isCapturing: false });
            if (!shouldStart) disableNetworkDebugger();
            return { success: false, error: "Cannot connect to tab or page is restricted (e.g., Chrome web store, New Tab page)." };
        }
    }
}


console.log("[Background Script] Service Worker started.");

function downloadText(filename: string, text: string) {
	try {
		const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
		chrome.downloads.download({ url, filename, conflictAction: 'overwrite', saveAs: false });
	} catch (e) {
		console.warn('[Background] downloads.download failed', e);
	}
}

chrome.runtime.onMessage.addListener(
	(request: ToggleMessage | PathFoundMessage | { action: "interactionCaptured"; interaction: InteractionPayload } | ResumeCapturingMessage, sender, sendResponse) => {
    
    if (request.action === "toggleCapture") {
        const { shouldStart } = request as ToggleMessage;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) {
                console.error("[Background] No active tab found.");
                sendResponse({ success: false, error: "No active tab." });
                return;
            }

            const tabId = tabs[0].id!; 
            
            setCapturingState(shouldStart, tabId)
                .then(sendResponse)
                .catch(e => {
                    console.error("Error setting capturing state:", e);
                    sendResponse({ success: false, error: (e as Error).message });
                });
        });
        
        return true; 
    }

    if (request.action === "RESUME_CAPTURING") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0 && tabs[0].id) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "RESUME_CAPTURING" });
            }
        });
        return false; // No response needed
    }

    if (request.action === "domPathFound") {
      const data = request as PathFoundMessage;
      
      const capturedData: CapturedPath = { 
        path: data.path, 
        url: data.url,
        timestamp: new Date().toISOString(),
        tabId: sender.tab?.id ?? 'N/A'
      };

      console.groupCollapsed("--- DOM Path Captured & Stored ---");
      console.log("Source URL:", capturedData.url);
      console.log("Captured Path:", capturedData.path);
      console.log("Time:", capturedData.timestamp);
      console.groupEnd();
      
      chrome.storage.local.set({ latestPath: capturedData }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error setting latestPath:", chrome.runtime.lastError);
        } else {
          console.log("Latest path successfully saved to storage.");
        }
      });
      
      chrome.storage.local.get(['pathHistory'], (result: HistoryResult) => {
        const history = result.pathHistory || [];
        
        history.unshift(capturedData); 
        
        if (history.length > 50) {
          history.pop();
        }
        
        chrome.storage.local.set({ pathHistory: history }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating pathHistory:", chrome.runtime.lastError);
          } else {
            console.log(`Path added to history. Total entries: ${history.length}`);
          }
        });
      });
    }

    if (request.action === "interactionCaptured") {
        const { interaction } = request as { action: "interactionCaptured"; interaction: InteractionPayload };
        console.groupCollapsed("--- Interaction Captured ---");
        console.log(interaction);
        console.groupEnd();

        chrome.storage.local.get(['interactionHistory'], (res) => {
            const history: InteractionPayload[] = Array.isArray(res.interactionHistory) ? res.interactionHistory : [];
            history.unshift(interaction);
            if (history.length > 50) history.pop();
            chrome.storage.local.set({ latestInteraction: interaction, interactionHistory: history }, () => {
                try {
                    const text = JSON.stringify(interaction, null, 2);
                    // downloadText('output.txt', text);
                } catch {}
            });
        });
    }

    return false;
  }
);