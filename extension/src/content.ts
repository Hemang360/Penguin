import { getDomPath } from "./utils/domPath"; 

class DomPathCapturer {
    private listenerActive: boolean = false;

    private handleClick = (e: MouseEvent) => {
        e.preventDefault(); 
        e.stopPropagation();

        const target = e.target;
        if (!(target instanceof Element)) return;

        const path = getDomPath(target);

        console.log(`[Content Script] Path calculated: ${path}`);

        chrome.runtime.sendMessage({
            action: "domPathFound",
            path: path,
            url: window.location.href
        });
    }

    public start() {
        if (!this.listenerActive) {
            document.body.addEventListener('click', this.handleClick, { capture: true }); 
            this.listenerActive = true;
            console.log("[Content Script] DOM Path Click Listener attached.");
        }
    }

    public stop() {
        if (this.listenerActive) {
            document.body.removeEventListener('click', this.handleClick, { capture: true });
            this.listenerActive = false;
            console.log("[Content Script] DOM Path Click Listener detached.");
        }
    }
}

const capturer = new DomPathCapturer();

chrome.storage.local.get('isCapturing', (data) => {
    if (data.isCapturing) {
        capturer.start();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SET_CAPTURING') {
        if (message.value === true) {
            capturer.start();
        } else {
            capturer.stop();
        }
        sendResponse({ success: true, isCapturing: message.value }); 
        return true;
    }
});