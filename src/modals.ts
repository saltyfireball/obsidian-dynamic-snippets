import { Modal, Notice } from "obsidian";
import type { App, Plugin } from "obsidian";
import type { CssSnippet, JsSnippet, SnippetBase, DeviceInfo, KnownDeviceEntry } from "./types";

export interface SnippetPluginContext extends Plugin {
	settings: {
		cssSnippets: CssSnippet[];
		jsSnippets: JsSnippet[];
		knownDevices: Record<string, KnownDeviceEntry>;
	};
	deviceInfo: DeviceInfo;
	getDeviceDisplayName(deviceId: string): string;
	getSnippetStyleEl(): HTMLStyleElement | undefined;
	saveSettings(): Promise<void>;
}

type DeviceToggleOptions = {
	container: HTMLElement;
	plugin: SnippetPluginContext;
	snippetData: SnippetBase;
	checkboxIdPrefix: string;
};

function renderKnownDeviceToggles(options: DeviceToggleOptions) {
	const { container, plugin, snippetData, checkboxIdPrefix } = options;
	const currentDeviceId = plugin.deviceInfo.id;
	const knownDevices: Record<string, KnownDeviceEntry> =
		plugin.settings.knownDevices || {};
	const otherDeviceIds = Object.keys(knownDevices).filter(
		(id) => id !== currentDeviceId,
	);
	if (otherDeviceIds.length === 0) return;

	const devicesRow = container.createDiv("ds-form-row");
	devicesRow.createEl("label", {
		text: "Other known devices:",
		cls: "ds-label-muted",
	});

	const deviceGrid = devicesRow.createDiv("ds-device-grid");

	for (const deviceId of otherDeviceIds) {
		const device = knownDevices[deviceId];
		if (!device) continue;
		const wrapper = deviceGrid.createDiv("ds-device-checkbox");

		const checkbox = wrapper.createEl("input", {
			type: "checkbox",
			attr: { id: `${checkboxIdPrefix}${deviceId}` },
		});
		checkbox.checked = !!(
			snippetData.enabledDevices && snippetData.enabledDevices[deviceId]
		);
		checkbox.addEventListener("change", () => {
			if (!snippetData.enabledDevices) {
				snippetData.enabledDevices = {};
			}
			snippetData.enabledDevices[deviceId] = checkbox.checked;
		});

		wrapper.createEl("label", {
			text: device.name,
			attr: {
				for: `${checkboxIdPrefix}${deviceId}`,
				title: `${device.type} - ${deviceId.substring(0, 8)}...`,
			},
		});
	}
}

type ClipboardService = {
	writeText?: (value: string) => Promise<void>;
	readText?: () => Promise<string>;
};

function getClipboardService(app: App): ClipboardService | null {
	const appClipboard =
		(app as unknown as { clipboard?: ClipboardService }).clipboard ?? null;
	if (appClipboard && typeof appClipboard.writeText === "function") {
		return appClipboard;
	}

	if (typeof navigator !== "undefined" && navigator.clipboard) {
		return navigator.clipboard;
	}

	const globalClipboard =
		(globalThis as unknown as { clipboard?: ClipboardService }).clipboard ??
		null;
	if (globalClipboard && typeof globalClipboard.writeText === "function") {
		return globalClipboard;
	}

	return null;
}

async function copyTextareaValue(
	textarea: HTMLTextAreaElement,
	app: App,
): Promise<boolean> {
	const clipboard = getClipboardService(app);
	if (clipboard?.writeText) {
		try {
			await clipboard.writeText(textarea.value);
			return true;
		} catch (error) {
			console.error("Failed to copy snippet text", error);
		}
	}

	if (
		typeof document !== "undefined" &&
		typeof document.execCommand === "function"
	) {
		const prevStart = textarea.selectionStart ?? 0;
		const prevEnd = textarea.selectionEnd ?? 0;
		textarea.select();
		try {
			return document.execCommand("copy");
		} finally {
			textarea.setSelectionRange(prevStart, prevEnd);
		}
	}

	return false;
}

async function readClipboardText(app: App): Promise<string | null> {
	const clipboard = getClipboardService(app);
	if (clipboard?.readText) {
		try {
			return await clipboard.readText();
		} catch (error) {
			console.error("Failed to read clipboard text", error);
		}
	}
	return null;
}

function insertTextAtCursor(textarea: HTMLTextAreaElement, text: string) {
	const start = textarea.selectionStart ?? textarea.value.length;
	const end = textarea.selectionEnd ?? start;
	textarea.setRangeText(text, start, end, "end");
	const caret = start + text.length;
	textarea.setSelectionRange(caret, caret);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

type SnippetTextareaAction = {
	label: string;
	handler: (event: Event) => void | Promise<void>;
};

function attachSnippetTextareaControls(
	container: HTMLElement,
	textarea: HTMLTextAreaElement,
	plugin: SnippetPluginContext,
) {
	const actions: SnippetTextareaAction[] = [
		{
			label: "Select All",
			handler: () => {
				textarea.focus();
				textarea.select();
			},
		},
		{
			label: "Copy",
			handler: async () => {
				const success = await copyTextareaValue(textarea, plugin.app);
				if (!success) {
					new Notice("Unable to copy snippet text to clipboard");
				}
			},
		},
		{
			label: "Paste",
			handler: async () => {
				const clipboardText = await readClipboardText(plugin.app);
				if (clipboardText === null) {
					new Notice("Clipboard paste unavailable");
					return;
				}
				textarea.focus();
				insertTextAtCursor(textarea, clipboardText);
			},
		},
		{
			label: "Clear",
			handler: () => {
				textarea.value = "";
				textarea.dispatchEvent(new Event("input", { bubbles: true }));
				textarea.focus();
			},
		},
	];

	for (const action of actions) {
		const button = container.createEl("button", {
			text: action.label,
			cls: "ds-snippet-control-btn",
			attr: { type: "button" },
		});
		button.addEventListener("click", (event) => {
			event.preventDefault();
			void action.handler(event);
		});
	}
}

export class CssSnippetModal extends Modal {
	plugin: SnippetPluginContext;
	existingSnippet?: CssSnippet;
	onSave: (snippet: CssSnippet) => void;
	snippetData: CssSnippet;

	constructor(
		app: App,
		plugin: SnippetPluginContext,
		existingSnippet: CssSnippet | null,
		onSave: (snippet: CssSnippet) => void,
	) {
		super(app);
		this.plugin = plugin;
		this.existingSnippet = existingSnippet || undefined;
		this.onSave = onSave;

		const currentDeviceId = this.plugin.deviceInfo.id;

		if (existingSnippet) {
			this.snippetData = { ...existingSnippet };
		} else {
			this.snippetData = {
				id: `snippet-${Date.now()}`,
				name: "",
				css: "",
				enabledDevices: {
					[currentDeviceId]: true,
				},
			};
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ds-snippet-modal");

		const isEditing = !!this.existingSnippet;
		const currentDeviceId = this.plugin.deviceInfo.id;
		const currentDeviceName =
			this.plugin.getDeviceDisplayName(currentDeviceId);

		contentEl.createEl("h2", {
			text: isEditing ? "Edit CSS Snippet" : "Add CSS Snippet",
		});

		const nameRow = contentEl.createDiv("ds-form-row");
		nameRow.createEl("label", { text: "Snippet Name" });
		const nameInput = nameRow.createEl("input", {
			type: "text",
			value: this.snippetData.name,
			placeholder: "e.g., Mobile Font Size, Dark Mode Tweaks",
		});
		nameInput.addEventListener("input", () => {
			this.snippetData.name = nameInput.value;
		});

		const cssRow = contentEl.createDiv("ds-form-row");
		cssRow.createEl("label", { text: "CSS Code" });
		const cssTextareaWrapper = cssRow.createDiv(
			"ds-snippet-textarea-wrapper",
		);
		const cssControlRow = cssTextareaWrapper.createDiv(
			"ds-snippet-textarea-controls",
		);
		const cssTextarea = cssTextareaWrapper.createEl("textarea", {
			placeholder: "/* Your CSS here */\n.some-class {\n  color: red;\n}",
		}) as HTMLTextAreaElement;
		attachSnippetTextareaControls(cssControlRow, cssTextarea, this.plugin);
		cssTextarea.value = this.snippetData.css;
		cssTextarea.rows = 12;
		cssTextarea.addEventListener("input", () => {
			this.snippetData.css = cssTextarea.value;
		});

		const enableRow = contentEl.createDiv(
			"ds-form-row ds-enable-device-row",
		);
		const enableCheckbox = enableRow.createEl("input", {
			type: "checkbox",
			attr: { id: "modal-enable-this-device" },
		});
		enableCheckbox.checked = !!(
			this.snippetData.enabledDevices &&
			this.snippetData.enabledDevices[currentDeviceId]
		);
		enableCheckbox.addEventListener("change", () => {
			if (!this.snippetData.enabledDevices) {
				this.snippetData.enabledDevices = {};
			}
			this.snippetData.enabledDevices[currentDeviceId] =
				enableCheckbox.checked;
		});
		enableRow.createEl("label", {
			text: `Enable on this device (${currentDeviceName})`,
			attr: { for: "modal-enable-this-device" },
		});

		renderKnownDeviceToggles({
			container: contentEl,
			plugin: this.plugin,
			snippetData: this.snippetData,
			checkboxIdPrefix: "modal-device-",
		});

		const actions = contentEl.createDiv("ds-modal-actions");

		const cancelBtn = actions.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const saveBtn = actions.createEl("button", {
			text: isEditing ? "Save Changes" : "Add Snippet",
			cls: "mod-cta",
		});
		saveBtn.addEventListener("click", () => {
			if (!this.snippetData.name.trim()) {
				new Notice("Please enter a snippet name");
				return;
			}
			if (!this.snippetData.css.trim()) {
				new Notice("Please enter some CSS");
				return;
			}
			this.onSave(this.snippetData);
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

export class JsSnippetModal extends Modal {
	plugin: SnippetPluginContext;
	existingSnippet?: JsSnippet;
	onSave: (snippet: JsSnippet) => void;
	snippetData: JsSnippet;

	constructor(
		app: App,
		plugin: SnippetPluginContext,
		existingSnippet: JsSnippet | null,
		onSave: (snippet: JsSnippet) => void,
	) {
		super(app);
		this.plugin = plugin;
		this.existingSnippet = existingSnippet || undefined;
		this.onSave = onSave;

		const currentDeviceId = this.plugin.deviceInfo.id;

		if (existingSnippet) {
			this.snippetData = { ...existingSnippet };
		} else {
			this.snippetData = {
				id: `js-snippet-${Date.now()}`,
				name: "",
				js: "",
				enabledDevices: {
					[currentDeviceId]: true,
				},
			};
		}
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("ds-snippet-modal");

		const isEditing = !!this.existingSnippet;
		const currentDeviceId = this.plugin.deviceInfo.id;
		const currentDeviceName =
			this.plugin.getDeviceDisplayName(currentDeviceId);

		contentEl.createEl("h2", {
			text: isEditing ? "Edit JS Snippet" : "Add JS Snippet",
		});

		const warningEl = contentEl.createEl("div", { cls: "ds-js-warning" });
		warningEl.createEl("span", {
			text: " JavaScript has full access to Obsidian and your vault. Only add code you trust.",
		});

		const nameRow = contentEl.createDiv("ds-form-row");
		nameRow.createEl("label", { text: "Snippet Name" });
		const nameInput = nameRow.createEl("input", {
			type: "text",
			value: this.snippetData.name,
			placeholder: "e.g., Auto-link Tasks, Custom Hotkeys",
		});
		nameInput.addEventListener("input", () => {
			this.snippetData.name = nameInput.value;
		});

		const jsRow = contentEl.createDiv("ds-form-row");
		jsRow.createEl("label", { text: "JavaScript Code" });
		const jsTextareaWrapper = jsRow.createDiv(
			"ds-snippet-textarea-wrapper",
		);
		const jsControlRow = jsTextareaWrapper.createDiv(
			"ds-snippet-textarea-controls",
		);
		const jsTextarea = jsTextareaWrapper.createEl("textarea", {
			placeholder:
				'// Your JavaScript here\nconsole.log("Hello from Dynamic Snippets!");',
		}) as HTMLTextAreaElement;
		attachSnippetTextareaControls(jsControlRow, jsTextarea, this.plugin);
		jsTextarea.value = this.snippetData.js;
		jsTextarea.rows = 12;
		jsTextarea.addEventListener("input", () => {
			this.snippetData.js = jsTextarea.value;
		});

		const enableRow = contentEl.createDiv(
			"ds-form-row ds-enable-device-row",
		);
		const enableCheckbox = enableRow.createEl("input", {
			type: "checkbox",
			attr: { id: "js-modal-enable-this-device" },
		});
		enableCheckbox.checked = !!(
			this.snippetData.enabledDevices &&
			this.snippetData.enabledDevices[currentDeviceId]
		);
		enableCheckbox.addEventListener("change", () => {
			if (!this.snippetData.enabledDevices) {
				this.snippetData.enabledDevices = {};
			}
			this.snippetData.enabledDevices[currentDeviceId] =
				enableCheckbox.checked;
		});
		enableRow.createEl("label", {
			text: `Enable on this device (${currentDeviceName})`,
			attr: { for: "js-modal-enable-this-device" },
		});

		renderKnownDeviceToggles({
			container: contentEl,
			plugin: this.plugin,
			snippetData: this.snippetData,
			checkboxIdPrefix: "js-modal-device-",
		});

		const actions = contentEl.createDiv("ds-modal-actions");

		const cancelBtn = actions.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());

		const saveBtn = actions.createEl("button", {
			text: isEditing ? "Save Changes" : "Add Snippet",
			cls: "mod-cta",
		});
		saveBtn.addEventListener("click", () => {
			if (!this.snippetData.name.trim()) {
				new Notice("Please enter a snippet name");
				return;
			}
			if (!this.snippetData.js.trim()) {
				new Notice("Please enter some JavaScript");
				return;
			}
			this.onSave(this.snippetData);
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
