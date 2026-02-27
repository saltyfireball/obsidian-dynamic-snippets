import { Plugin, PluginSettingTab, App, Setting } from "obsidian";
import type { CssSnippet, JsSnippet, KnownDeviceEntry, DeviceInfo } from "./types";
import { getDeviceInfo } from "./device";
import { updateCssSnippets, updateJsSnippets, cleanupJsSnippets } from "./update";
import { renderCssSnippetsSection, renderJsSnippetsSection } from "./settings-ui";
import type { SnippetPluginContext } from "./modals";

interface DynamicSnippetsSettings {
	cssSnippets: CssSnippet[];
	jsSnippets: JsSnippet[];
	knownDevices: Record<string, KnownDeviceEntry>;
}

const DEFAULT_SETTINGS: DynamicSnippetsSettings = {
	cssSnippets: [],
	jsSnippets: [],
	knownDevices: {},
};

export default class DynamicSnippetsPlugin extends Plugin implements SnippetPluginContext {
	settings!: DynamicSnippetsSettings;
	deviceInfo!: DeviceInfo;
	private snippetStyleEl?: HTMLStyleElement;

	async onload() {
		await this.loadSettings();

		// Create managed style element for CSS snippets
		this.snippetStyleEl = this.createStyleEl();

		// Detect and register current device
		this.deviceInfo = getDeviceInfo();
		this.registerCurrentDevice();

		// Apply snippets
		this.applySnippets();

		// Settings tab
		this.addSettingTab(new DynamicSnippetsSettingTab(this.app, this));
	}

	onunload() {
		if (this.snippetStyleEl) {
			this.snippetStyleEl.remove();
		}
		cleanupJsSnippets();
	}

	private createStyleEl(): HTMLStyleElement {
		const id = "dynamic-snippets-styles";
		document.getElementById(id)?.remove();
		const el = document.createElement("style");
		el.id = id;
		document.head.appendChild(el);
		return el;
	}

	private registerCurrentDevice(): void {
		const deviceId = this.deviceInfo.id;
		const existing = this.settings.knownDevices[deviceId];
		this.settings.knownDevices[deviceId] = {
			id: deviceId,
			type: this.deviceInfo.type,
			typeLabel: this.deviceInfo.typeLabel,
			name: existing?.name || this.deviceInfo.typeLabel,
			lastSeen: Date.now(),
		};
	}

	applySnippets(): void {
		const source = {
			cssSnippets: this.settings.cssSnippets,
			jsSnippets: this.settings.jsSnippets,
			deviceId: this.deviceInfo.id,
		};
		updateCssSnippets(source, this.snippetStyleEl);
		updateJsSnippets(source);
	}

	getDeviceDisplayName(deviceId: string): string {
		const device = this.settings.knownDevices[deviceId];
		if (device) return device.name;
		return deviceId.substring(0, 8) + "...";
	}

	getSnippetStyleEl(): HTMLStyleElement | undefined {
		return this.snippetStyleEl;
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		// Ensure arrays exist
		if (!this.settings.cssSnippets) this.settings.cssSnippets = [];
		if (!this.settings.jsSnippets) this.settings.jsSnippets = [];
		if (!this.settings.knownDevices) this.settings.knownDevices = {};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class DynamicSnippetsSettingTab extends PluginSettingTab {
	plugin: DynamicSnippetsPlugin;
	private activeTab: "css" | "js" = "css";

	constructor(app: App, plugin: DynamicSnippetsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl).setName("Dynamic snippets").setHeading();
		containerEl.createEl("p", {
			text: "Manage CSS and JavaScript snippets with per-device control.",
			cls: "ds-hint",
		});

		// Tab buttons
		const tabBar = containerEl.createDiv("ds-tab-bar");
		const cssTab = tabBar.createEl("button", {
			text: "CSS Snippets",
			cls: `ds-tab-btn ${this.activeTab === "css" ? "ds-tab-active" : ""}`,
		});
		const jsTab = tabBar.createEl("button", {
			text: "JS Snippets",
			cls: `ds-tab-btn ${this.activeTab === "js" ? "ds-tab-active" : ""}`,
		});

		cssTab.addEventListener("click", () => {
			this.activeTab = "css";
			this.display();
		});
		jsTab.addEventListener("click", () => {
			this.activeTab = "js";
			this.display();
		});

		const contentEl = containerEl.createDiv("ds-tab-content");
		const rerender = () => this.display();

		if (this.activeTab === "css") {
			renderCssSnippetsSection({ app: this.app, plugin: this.plugin, contentEl, rerender });
		} else {
			renderJsSnippetsSection({ app: this.app, plugin: this.plugin, contentEl, rerender });
		}
	}
}
