import type { CssSnippet, JsSnippet } from "./types";

interface SnippetSource {
	cssSnippets: CssSnippet[];
	jsSnippets: JsSnippet[];
	deviceId: string;
}

const globalWindow = window as Window & {
	_dsCleanup?: Record<string, (() => void) | undefined>;
};

let jsScriptEl: HTMLScriptElement | null = null;

export function updateCssSnippets(
	source: SnippetSource,
	styleSheet?: CSSStyleSheet,
): void {
	if (!styleSheet) return;

	const snippets = source.cssSnippets || [];
	const deviceId = source.deviceId;

	const enabledSnippets = snippets.filter((snippet) => {
		return snippet.enabledDevices && snippet.enabledDevices[deviceId] === true;
	});

	const css = enabledSnippets
		.map((snippet) => `/* Snippet: ${snippet.name} */\n${snippet.css}`)
		.join("\n\n");

	styleSheet.replaceSync(css);
}

export function cleanupJsSnippets(): void {
	if (globalWindow._dsCleanup && typeof globalWindow._dsCleanup === "object") {
		for (const [name, fn] of Object.entries(globalWindow._dsCleanup)) {
			try {
				if (typeof fn === "function") {
					fn();
				}
			} catch (e) {
				console.error(`[DynamicSnippets] Error cleaning up snippet "${name}":`, e);
			}
		}
	}
	globalWindow._dsCleanup = {};

	if (jsScriptEl) {
		jsScriptEl.remove();
		jsScriptEl = null;
	}
}

export function updateJsSnippets(source: SnippetSource): void {
	cleanupJsSnippets();

	const snippets = source.jsSnippets || [];
	const deviceId = source.deviceId;

	const enabledSnippets = snippets.filter((snippet) => {
		return snippet.enabledDevices && snippet.enabledDevices[deviceId] === true;
	});

	if (enabledSnippets.length === 0) return;

	const js = enabledSnippets
		.map((snippet) => {
			return `// Snippet: ${snippet.name}\ntry {\n${snippet.js}\n} catch(e) { console.error('[DynamicSnippets] Error in snippet "${snippet.name}":', e); }`;
		})
		.join("\n\n");

	jsScriptEl = document.createElement("script");
	jsScriptEl.id = "dynamic-snippets-js";
	jsScriptEl.textContent = js;
	document.head.appendChild(jsScriptEl);
}
