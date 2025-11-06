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

        safeSendMessage({
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

// Safe wrappers to avoid "Extension context invalidated" runtime errors
function canUseExtensionApis(): boolean {
	try {
		return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
	} catch {
		return false;
	}
}

function safeSendMessage(message: any) {
	if (!canUseExtensionApis()) return;
	try { chrome.runtime.sendMessage(message); } catch { /* no-op */ }
}

function safeSetStorage(obj: Record<string, any>) {
	if (!canUseExtensionApis()) return;
	try { chrome.storage.local.set(obj); } catch { /* no-op */ }
}

// --- Provider Detection & Scraping Helpers ---

type Provider = "chatgpt" | "claude" | "gemini" | "perplexity" | "unknown";

function detectProvider(href: string): Provider {
	try {
		const u = new URL(href);
		const host = u.hostname;
		if (host.includes("chat.openai.com")) return "chatgpt";
		if (host.includes("claude.ai")) return "claude";
		if (host.includes("gemini.google.com")) return "gemini";
		if (host.includes("perplexity.ai")) return "perplexity";
		return "unknown";
	} catch {
		return "unknown";
	}
}

function getModelVersion(provider: Provider): string {
	// Heuristics; many UIs do not expose model reliably in DOM
	switch (provider) {
		case "chatgpt": {
			const el = document.querySelector('[data-testid="model-switcher"]') || document.querySelector('[data-testid*="model"]');
			return (el?.textContent || "unknown").trim();
		}
		case "claude": {
			const el = document.querySelector('[data-cy="model-selector"]') || document.querySelector('[aria-label*="Model"]');
			return (el?.textContent || "unknown").trim();
		}
		case "gemini":
			return "unknown";
		case "perplexity":
			return "unknown";
		default:
			return "unknown";
	}
}

// Recursively collect text including inside shadow DOM
function getDeepText(root: Element): string {
	let text = '';
	function walk(node: Node) {
		if (node.nodeType === Node.TEXT_NODE) {
			const val = (node as Text).data;
			if (val && val.trim()) text += val.trim() + ' ';
			return;
		}
		if (node instanceof Element) {
			// Skip hidden elements
			const style = window.getComputedStyle(node);
			if (style && (style.display === 'none' || style.visibility === 'hidden')) return;
			for (const child of Array.from(node.childNodes) as unknown as Node[]) walk(child);
			// Shadow DOM
			const anyEl = node as any;
			if (anyEl.shadowRoot) {
				for (const child of Array.from(anyEl.shadowRoot.childNodes) as unknown as Node[]) walk(child);
			}
		}
	}
	walk(root);
	return text.trim();
}

function extractLatestUserPrompt(provider: Provider): string | null {
	switch (provider) {
		case "chatgpt": {
			// Prefer last user message bubble; fallback to textarea value
			const lastUserMsg = Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-testid="user-message"]')).pop() as HTMLElement | undefined;
			if (lastUserMsg) return lastUserMsg.innerText.trim() || lastUserMsg.textContent?.trim() || null;
			const ta = document.querySelector('textarea');
			return (ta as HTMLTextAreaElement | null)?.value?.trim() || null;
		}
		case "claude": {
			const lastUserMsg = Array.from(document.querySelectorAll('[data-cy="message"][data-author="user"], [data-testid="user-message"]')).pop() as HTMLElement | undefined;
			if (lastUserMsg) return lastUserMsg.innerText.trim() || lastUserMsg.textContent?.trim() || null;
			const ce = document.querySelector('[contenteditable="true"]');
			return (ce as HTMLElement | null)?.innerText?.trim() || null;
		}
		case "gemini": {
			// Prefer Gemini custom elements; deep text to traverse shadow roots
			const candidates = [
				'user-query user-query-content',
				'user-query-content',
				'user-query',
				'[data-message-author="user"]',
				'article[aria-label*="You said"]'
			];
			for (const sel of candidates) {
				const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
				for (let i = nodes.length - 1; i >= 0; i--) {
					const deep = getDeepText(nodes[i]);
					if (deep) return deep;
				}
			}
			const ta = document.querySelector('textarea, [role="textbox"][contenteditable="true"]');
			const fallback = ((ta as HTMLTextAreaElement | null)?.value || (ta as HTMLElement | null)?.innerText || '').trim();
			return fallback || null;
		}
		case "perplexity": {
			const lastUserMsg = Array.from(document.querySelectorAll('[data-author="user"], .message.user'))
				.pop() as HTMLElement | undefined;
			if (lastUserMsg) return lastUserMsg.innerText.trim() || lastUserMsg.textContent?.trim() || null;
			const ta = document.querySelector('textarea');
			return (ta as HTMLTextAreaElement | null)?.value?.trim() || null;
		}
		default:
			const ta = document.querySelector('textarea');
			return (ta as HTMLTextAreaElement | null)?.value?.trim() || null;
	}
}

function extractLatestAssistantOutput(provider: Provider): string | null {
	switch (provider) {
		case "chatgpt": {
			const lastAssistant = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], [data-testid="assistant-message"], .markdown'))
				.pop() as HTMLElement | undefined;
			return lastAssistant?.innerText?.trim() || lastAssistant?.textContent?.trim() || null;
		}
		case "claude": {
			const lastAssistant = Array.from(document.querySelectorAll('[data-cy="message"][data-author="assistant"], [data-testid="assistant-message"], .message .prose, .message .content'))
				.pop() as HTMLElement | undefined;
			return lastAssistant?.innerText?.trim() || lastAssistant?.textContent?.trim() || null;
		}
		case "gemini": {
			// Use deep text on key containers
			const containers = [
				'[id^="model-response-message-content"]',
				'model-response',
				'model-response .response',
				'response-element rich-text',
				'rich-text',
				'[data-message-author="model"]',
				'article[aria-label*="Gemini"] .response',
				'article .markdown'
			];
			for (const sel of containers) {
				const nodes = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
				for (let i = nodes.length - 1; i >= 0; i--) {
					const deep = getDeepText(nodes[i]);
					if (deep) return deep;
				}
			}
			return null;
		}
		case "perplexity": {
			const lastAssistant = Array.from(document.querySelectorAll('.prose, [data-testid="response"], .answer'))
				.pop() as HTMLElement | undefined;
			return lastAssistant?.innerText?.trim() || lastAssistant?.textContent?.trim() || null;
		}
		default:
			const article = Array.from(document.querySelectorAll('article, .markdown, .prose')).pop() as HTMLElement | undefined;
			return article?.innerText?.trim() || article?.textContent?.trim() || null;
	}
}

// New: find assistant container and text together for media extraction
function getLatestAssistantContext(provider: Provider): { text: string | null; container: HTMLElement | null } {
	const pick = (nodes: HTMLElement[]): { text: string | null; container: HTMLElement | null } => {
		for (let i = nodes.length - 1; i >= 0; i--) {
			const node = nodes[i];
			const deep = getDeepText(node);
			if (deep) return { text: deep, container: node };
		}
		return { text: null, container: null };
	};

	switch (provider) {
		case "chatgpt":
			return pick(Array.from(document.querySelectorAll('[data-message-author-role="assistant"], [data-testid="assistant-message"], .markdown')) as HTMLElement[]);
		case "claude":
			return pick(Array.from(document.querySelectorAll('[data-cy="message"][data-author="assistant"], [data-testid="assistant-message"], .message .prose, .message .content')) as HTMLElement[]);
		case "gemini":
			return pick(Array.from(document.querySelectorAll('[id^="model-response-message-content"], model-response, model-response .response, response-element rich-text, rich-text, [data-message-author="model"], article[aria-label*="Gemini"] .response, article .markdown')) as HTMLElement[]);
		case "perplexity":
			return pick(Array.from(document.querySelectorAll('.prose, [data-testid="response"], .answer')) as HTMLElement[]);
		default:
			return pick(Array.from(document.querySelectorAll('article, .markdown, .prose')) as HTMLElement[]);
	}
}

// Collect media attachments from a container
interface Attachment {
	type: "image" | "audio" | "video" | "file";
	url: string;
	mime?: string;
	dataUrl?: string; // may be omitted if large or blocked
	filename?: string;
}

async function toDataUrlIfSmall(url: string, maxBytes = 2_000_000): Promise<{ dataUrl?: string; mime?: string }>{
	try {
		if (url.startsWith('data:')) return { dataUrl: url, mime: url.substring(5, url.indexOf(';')) };
		const res = await fetch(url, { credentials: 'omit' });
		const blob = await res.blob();
		if (blob.size > maxBytes) return { mime: blob.type };
		const reader = new FileReader();
		return await new Promise((resolve) => {
			reader.onloadend = () => resolve({ dataUrl: reader.result as string, mime: blob.type });
			reader.onerror = () => resolve({ mime: blob.type });
			reader.readAsDataURL(blob);
		});
	} catch {
		return {};
	}
}

async function collectAttachmentsFrom(container: HTMLElement | null): Promise<Attachment[]> {
	if (!container) return [];
	const attachments: Attachment[] = [];

	const imgs = Array.from(container.querySelectorAll('img, image, svg image')) as HTMLImageElement[];
	for (const img of imgs) {
		const rawUrl = (img.currentSrc || img.src || img.getAttribute('srcset') || '').trim();
		if (!rawUrl) continue;
		const url = rawUrl.split(' ').shift() as string;
		const meta = await toDataUrlIfSmall(url);
		attachments.push({ type: "image", url, ...meta, filename: img.getAttribute('alt') || undefined });
	}

	const videos = Array.from(container.querySelectorAll('video')) as HTMLVideoElement[];
	for (const v of videos) {
		const source = v.currentSrc || (v.querySelector('source')?.src || '');
		if (!source) continue;
		attachments.push({ type: "video", url: source });
	}

	const audios = Array.from(container.querySelectorAll('audio')) as HTMLAudioElement[];
	for (const a of audios) {
		const source = a.currentSrc || (a.querySelector('source')?.src || '');
		if (!source) continue;
		attachments.push({ type: "audio", url: source });
	}

	const links = Array.from(container.querySelectorAll('a[href]')) as HTMLAnchorElement[];
	for (const a of links) {
		const href = a.href;
		if (!href) continue;
		const lower = href.toLowerCase();
		if (lower.endsWith('.pdf') || lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.zip')) {
			attachments.push({ type: "file", url: href, filename: a.download || a.textContent?.trim() || undefined });
		}
	}

	// Merge with recentAssets captured by background debugger
	try {
		chrome.storage.local.get(['recentAssets'], (res) => {
			const recent: { url: string; mime?: string; base64?: string }[] = Array.isArray(res.recentAssets) ? res.recentAssets : [];
			for (const att of attachments) {
				if (!att.dataUrl) {
					const match = recent.find(x => x.url === att.url && x.base64);
					if (match && match.base64) {
						att.dataUrl = `data:${match.mime || ''};base64,${match.base64}`;
						att.mime = match.mime || att.mime;
					}
				}
			}
		});
	} catch {}

	return attachments;
}

let observer: MutationObserver | null = null;
let lastOutputSignature: string | null = null;
let geminiInterval: number | null = null;

async function emitInteraction(provider: Provider) {
	const ctx = getLatestAssistantContext(provider);
	const outputText = ctx.text;
	if (!outputText) return;
	const signature = outputText.slice(0, 200);
	if (lastOutputSignature === signature) return;
	lastOutputSignature = signature;

	const inputPrompt = extractLatestUserPrompt(provider) || "";
	const url = window.location.origin; // domain as requested
	const modelVersion = getModelVersion(provider);

	const attachments = await collectAttachmentsFrom(ctx.container);

	// Prefer media as output; if none, fall back to text
	const output: any = attachments.length > 0 ? attachments : outputText;

	const interaction = {
		url,
		input: inputPrompt,
		output,
		"modal-version": modelVersion,
		timestamp: new Date().toISOString()
	};

	console.groupCollapsed("[Content Script] Interaction captured");
	console.log(interaction);
	console.groupEnd();

	safeSetStorage({ latestInteraction: interaction });
	safeSendMessage({ action: "interactionCaptured", interaction });
}

function startScraping() {
	const provider = detectProvider(window.location.href);
	console.log(`[Content Script] Provider detected: ${provider}`);

	if (observer) { observer.disconnect(); observer = null; }
	if (geminiInterval !== null) { window.clearInterval(geminiInterval); geminiInterval = null; }

	if (provider === 'gemini') {
		// Poll because much of Gemini's UI lives in shadow DOMs that MutationObserver won't see
		geminiInterval = window.setInterval(() => emitInteraction(provider), 1200);
		return;
	}

	observer = new MutationObserver(() => emitInteraction(provider));
	observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function stopScraping() {
	if (observer) { observer.disconnect(); observer = null; }
	if (geminiInterval !== null) { window.clearInterval(geminiInterval); geminiInterval = null; }
	lastOutputSignature = null;
}

chrome.storage.local.get('isCapturing', (data) => {
    if (data.isCapturing) {
        capturer.start();
        startScraping();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SET_CAPTURING') {
        if (message.value === true) {
            capturer.start();
            startScraping();
        } else {
            capturer.stop();
            stopScraping();
        }
        sendResponse({ success: true, isCapturing: message.value }); 
        return true;
    }
});