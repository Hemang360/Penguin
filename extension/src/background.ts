console.log("[Background Script] Service Worker started.");

async function setCapturingState(isCapturing: boolean, tabId: number) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { 
            action: 'SET_CAPTURING', 
            value: isCapturing 
        });

        if (response && response.success) {
            await chrome.storage.local.set({ isCapturing: isCapturing });
            console.log(`[Background] Capturing state set successfully to: ${isCapturing}`);
            return { success: true };
        } else {
            await chrome.storage.local.set({ isCapturing: false });
            console.error("[Background] Content script failed to acknowledge SET_CAPTURING.");
            return { success: false, error: "Content script did not respond correctly." };
        }
    } catch (e) {
        console.error(`[Background] Failed to communicate with tab ${tabId}. Is the content script running?`, e);
        await chrome.storage.local.set({ isCapturing: false });
        return { success: false, error: "Cannot connect to tab or page is restricted." };
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleCapture") {
        const shouldStart = request.shouldStart;

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length === 0 || !tabs[0].id) {
                console.error("[Background] No active tab found.");
                sendResponse({ success: false, error: "No active tab." });
                return;
            }

            const tabId = tabs[0].id;
            
            setCapturingState(shouldStart, tabId)
                .then(sendResponse)
                .catch(e => {
                    console.error("Error setting capturing state:", e);
                    sendResponse({ success: false, error: e.message });
                });
        });
        
        return true; 
    }
    
    if (request.action === "domPathFound") {
        const capturedData = {
            path: request.path,
            url: request.url,
            timestamp: new Date().toISOString(),
            tabId: sender.tab ? sender.tab.id : 'N/A'
        };

        chrome.storage.local.set({ latestPath: capturedData }, () => {
            if (chrome.runtime.lastError) {
                console.error("Error setting latestPath:", chrome.runtime.lastError);
            } else {
                console.log("[Background] Latest path saved:", capturedData.path.substring(0, 50) + "...");
            }
        });
        
        chrome.storage.local.get(['pathHistory'], (result) => {
            const history = result.pathHistory || [];
            history.unshift(capturedData); 
            if (history.length > 50) {
                history.pop();
            }
            chrome.storage.local.set({ pathHistory: history });
        });
    }
});