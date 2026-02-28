import { Modal, Notice, Setting } from "obsidian";
import type { App } from "obsidian";
import { CssSnippetModal, JsSnippetModal } from "./modals";
import { updateCssSnippets, updateJsSnippets } from "./update";
import type { SnippetPluginContext } from "./modals";
import type { CssSnippet, JsSnippet, KnownDeviceEntry } from "./types";

export interface SnippetSettingsContext {
	app: App;
	plugin: SnippetPluginContext;
	contentEl: HTMLElement;
	rerender: () => void;
}

function getSnippetSource(plugin: SnippetPluginContext) {
	return {
		cssSnippets: plugin.settings.cssSnippets,
		jsSnippets: plugin.settings.jsSnippets,
		deviceId: plugin.deviceInfo.id,
	};
}

function applyCssSnippets(plugin: SnippetPluginContext) {
	updateCssSnippets(getSnippetSource(plugin), plugin.getSnippetStyleSheet());
}

export function renderCssSnippetsSection(context: SnippetSettingsContext) {
	const { app, plugin, contentEl, rerender } = context;

	if (!plugin.settings.knownDevices) {
		plugin.settings.knownDevices = {};
	}
	const knownDevices: Record<string, KnownDeviceEntry> =
		plugin.settings.knownDevices;
	const currentDeviceId = plugin.deviceInfo.id;
	const currentDeviceType = plugin.deviceInfo.typeLabel;
	const currentDeviceName = plugin.getDeviceDisplayName(currentDeviceId);

	if (!knownDevices[currentDeviceId]) {
		knownDevices[currentDeviceId] = {
			...plugin.deviceInfo,
			name: currentDeviceName,
		};
	}
	const currentDeviceEntry = knownDevices[currentDeviceId];

	new Setting(contentEl).setName("Custom CSS snippets").setHeading();

	const deviceSection = contentEl.createDiv("ds-current-device-section");
	deviceSection.createEl("span", { text: "This device: " });

	const deviceNameInput = deviceSection.createEl("input", {
		type: "text",
		value: currentDeviceName,
		cls: "ds-device-name-input",
	});
	deviceNameInput.addEventListener("change", () => {
		const newName = deviceNameInput.value.trim() || currentDeviceType;
		currentDeviceEntry.name = newName;
		void plugin.saveSettings().then(() => {
			new Notice(`Device renamed to "${newName}"`);
		});
	});

	deviceSection.createEl("span", {
		text: `(${currentDeviceType})`,
		cls: "ds-device-type-label",
	});

	contentEl.createEl("p", {
		text: "Add CSS snippets and toggle them on/off per device. Each device has a unique ID.",
		cls: "ds-hint",
	});

	const addBtn = contentEl.createEl("button", {
		text: "Add snippet",
		cls: "ds-add-snippet-btn",
	});
	addBtn.addEventListener("click", () => {
		new CssSnippetModal(app, plugin, null, (snippet) => {
			if (!plugin.settings.cssSnippets) {
				plugin.settings.cssSnippets = [] as CssSnippet[];
			}
			plugin.settings.cssSnippets.push(snippet);
			void plugin.saveSettings().then(() => {
				applyCssSnippets(plugin);
				rerender();
			});
		}).open();
	});

	const snippets = plugin.settings.cssSnippets || [];
	if (snippets.length === 0) {
		contentEl.createEl("p", {
			text: "No CSS snippets yet. Add one to get started.",
			cls: "ds-hint",
		});
		return;
	}

	const snippetsList = contentEl.createDiv("ds-snippets-list");

	for (const snippet of snippets) {
		const item = snippetsList.createDiv("ds-snippet-item");
		const headerRow = item.createDiv("ds-snippet-header");

		const currentToggle = headerRow.createEl("input", { type: "checkbox" });
		currentToggle.checked = !!(
			snippet.enabledDevices && snippet.enabledDevices[currentDeviceId]
		);
		currentToggle.addEventListener("change", () => {
			if (!snippet.enabledDevices) snippet.enabledDevices = {};
			snippet.enabledDevices[currentDeviceId] = currentToggle.checked;
			void plugin.saveSettings().then(() => {
				applyCssSnippets(plugin);
			});
		});

		const nameEl = headerRow.createEl("span", {
			text: snippet.name,
			cls: "ds-snippet-name",
		});
		nameEl.addEventListener("click", () => {
			item.classList.toggle("ds-snippet-expanded");
		});

		headerRow.createEl("span", { text: "\u203A", cls: "ds-snippet-arrow" });

		const actions = headerRow.createDiv("ds-snippet-actions");
		const editBtn = actions.createEl("button", {
			text: "\u270E",
			cls: "ds-snippet-edit-btn",
			attr: { title: "Edit" },
		});
		editBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			new CssSnippetModal(app, plugin, snippet, (updatedSnippet) => {
				Object.assign(snippet, updatedSnippet);
				void plugin.saveSettings().then(() => {
					applyCssSnippets(plugin);
					rerender();
				});
			}).open();
		});

		const deleteBtn = actions.createEl("button", {
			text: "\u00D7",
			cls: "ds-remove-btn",
			attr: { title: "Delete" },
		});
		deleteBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			new ConfirmModal(
				app,
				`Delete snippet "${snippet.name}"?`,
				() => {
					plugin.settings.cssSnippets = plugin.settings.cssSnippets.filter(
						(s) => s.id !== snippet.id,
					);
					void plugin.saveSettings().then(() => {
						applyCssSnippets(plugin);
						rerender();
					});
				},
			).open();
		});

		const details = item.createDiv("ds-snippet-details");
		const devicesSection = details.createDiv("ds-snippet-devices");
		devicesSection.createEl("label", { text: "Enabled on:" });
		const deviceToggles = devicesSection.createDiv("ds-device-toggles");

		const deviceIds = Object.keys(knownDevices).sort((a, b) => {
			if (a === currentDeviceId) return -1;
			if (b === currentDeviceId) return 1;
			return (
				(knownDevices[b]?.lastSeen || 0) - (knownDevices[a]?.lastSeen || 0)
			);
		});

		for (const deviceId of deviceIds) {
			const device = knownDevices[deviceId];
			if (!device) continue;
			const isCurrentDevice = deviceId === currentDeviceId;
			const toggleWrapper = deviceToggles.createDiv("ds-device-toggle");

			if (isCurrentDevice) {
				toggleWrapper.addClass("ds-current-device");
			}

			const checkbox = toggleWrapper.createEl("input", {
				type: "checkbox",
				attr: { id: `snippet-${snippet.id}-${deviceId}` },
			});
			checkbox.checked = !!(
				snippet.enabledDevices && snippet.enabledDevices[deviceId]
			);
			checkbox.addEventListener("change", () => {
				if (!snippet.enabledDevices) snippet.enabledDevices = {};
				snippet.enabledDevices[deviceId] = checkbox.checked;
				void plugin.saveSettings().then(() => {
					applyCssSnippets(plugin);
					if (isCurrentDevice) {
						currentToggle.checked = checkbox.checked;
					}
				});
			});

			const labelText = isCurrentDevice
				? `${device.name} (this)`
				: device.name;
			toggleWrapper.createEl("label", {
				text: labelText,
				attr: {
					for: `snippet-${snippet.id}-${deviceId}`,
					title: `${device.type} - ${deviceId.substring(0, 8)}...`,
				},
			});
		}

		const cssPreview = details.createDiv("ds-snippet-css-preview");
		cssPreview.createEl("label", { text: "CSS:" });
		const codeEl = cssPreview.createEl("pre");
		codeEl.createEl("code", {
			text:
				snippet.css.substring(0, 500) +
				(snippet.css.length > 500 ? "..." : ""),
		});
	}
}

export function renderJsSnippetsSection(context: SnippetSettingsContext) {
	const { app, plugin, contentEl, rerender } = context;

	if (!plugin.settings.knownDevices) {
		plugin.settings.knownDevices = {};
	}
	const knownDevices: Record<string, KnownDeviceEntry> =
		plugin.settings.knownDevices;
	const currentDeviceId = plugin.deviceInfo.id;
	const currentDeviceName = plugin.getDeviceDisplayName(currentDeviceId);

	if (!knownDevices[currentDeviceId]) {
		knownDevices[currentDeviceId] = {
			...plugin.deviceInfo,
			name: currentDeviceName,
		};
	}
	const currentJsDeviceEntry = knownDevices[currentDeviceId];

	new Setting(contentEl).setName("Custom JavaScript snippets").setHeading();
	contentEl.createEl("p", {
		text: "Add custom JavaScript that runs when Obsidian loads. Use with caution!",
		cls: "ds-hint",
	});

	const warningEl = contentEl.createEl("div", { cls: "ds-js-warning" });
	warningEl.createEl("strong", { text: "Warning: " });
	warningEl.createEl("span", {
		text: "JavaScript snippets can access your vault and system. Only add code you trust.",
	});

	const deviceInfo = contentEl.createDiv("ds-current-device-section");
	deviceInfo.createEl("span", { text: "Current device: " });
	const deviceNameInput = deviceInfo.createEl("input", {
		type: "text",
		value: currentDeviceName,
		cls: "ds-device-name-input",
	});
	deviceNameInput.addEventListener("change", () => {
		currentJsDeviceEntry.name = deviceNameInput.value;
		void plugin.saveSettings();
	});
	deviceInfo.createEl("span", {
		text: ` (${plugin.deviceInfo.type})`,
		cls: "ds-device-type-label",
	});

	const addBtn = contentEl.createEl("button", {
		text: "Add JavaScript snippet",
		cls: "ds-add-snippet-btn",
	});
	addBtn.addEventListener("click", () => {
		new JsSnippetModal(app, plugin, null, (snippet) => {
			if (!plugin.settings.jsSnippets) {
				plugin.settings.jsSnippets = [] as JsSnippet[];
			}
			plugin.settings.jsSnippets.push(snippet);
			void plugin.saveSettings().then(() => {
				updateJsSnippets(getSnippetSource(plugin));
				rerender();
			});
		}).open();
	});

	const snippets = plugin.settings.jsSnippets || [];
	if (snippets.length === 0) {
		contentEl.createEl("p", {
			text: "No JavaScript snippets yet. Add one to get started.",
			cls: "ds-hint",
		});
		return;
	}

	const snippetsList = contentEl.createDiv("ds-snippets-list");

	for (const snippet of snippets) {
		const item = snippetsList.createDiv("ds-snippet-item");
		const headerRow = item.createDiv("ds-snippet-header");

		const currentToggle = headerRow.createEl("input", { type: "checkbox" });
		currentToggle.checked = !!(
			snippet.enabledDevices && snippet.enabledDevices[currentDeviceId]
		);
		currentToggle.addEventListener("change", () => {
			if (!snippet.enabledDevices) snippet.enabledDevices = {};
			snippet.enabledDevices[currentDeviceId] = currentToggle.checked;
			void plugin.saveSettings().then(() => {
				updateJsSnippets(getSnippetSource(plugin));
			});
		});

		const nameEl = headerRow.createEl("span", {
			text: snippet.name,
			cls: "ds-snippet-name",
		});
		nameEl.addEventListener("click", () => {
			item.classList.toggle("ds-snippet-expanded");
		});

		headerRow.createEl("span", { text: "\u203A", cls: "ds-snippet-arrow" });

		const actions = headerRow.createDiv("ds-snippet-actions");
		const editBtn = actions.createEl("button", {
			text: "\u270E",
			cls: "ds-snippet-edit-btn",
			attr: { title: "Edit" },
		});
		editBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			new JsSnippetModal(app, plugin, snippet, (updatedSnippet) => {
				Object.assign(snippet, updatedSnippet);
				void plugin.saveSettings().then(() => {
					updateJsSnippets(getSnippetSource(plugin));
					rerender();
				});
			}).open();
		});

		const deleteBtn = actions.createEl("button", {
			text: "\u00D7",
			cls: "ds-remove-btn",
			attr: { title: "Delete" },
		});
		deleteBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			new ConfirmModal(
				app,
				`Delete snippet "${snippet.name}"?`,
				() => {
					plugin.settings.jsSnippets = plugin.settings.jsSnippets.filter(
						(s) => s.id !== snippet.id,
					);
					void plugin.saveSettings().then(() => {
						updateJsSnippets(getSnippetSource(plugin));
						rerender();
					});
				},
			).open();
		});

		const details = item.createDiv("ds-snippet-details");
		const devicesSection = details.createDiv("ds-snippet-devices");
		devicesSection.createEl("label", { text: "Enabled on:" });
		const deviceToggles = devicesSection.createDiv("ds-device-toggles");

		const deviceIds = Object.keys(knownDevices).sort((a, b) => {
			if (a === currentDeviceId) return -1;
			if (b === currentDeviceId) return 1;
			return (
				(knownDevices[b]?.lastSeen || 0) - (knownDevices[a]?.lastSeen || 0)
			);
		});

		for (const deviceId of deviceIds) {
			const device = knownDevices[deviceId];
			if (!device) continue;
			const isCurrentDevice = deviceId === currentDeviceId;
			const toggleWrapper = deviceToggles.createDiv("ds-device-toggle");

			if (isCurrentDevice) {
				toggleWrapper.addClass("ds-current-device");
			}

			const checkbox = toggleWrapper.createEl("input", {
				type: "checkbox",
				attr: { id: `js-snippet-${snippet.id}-${deviceId}` },
			});
			checkbox.checked = !!(
				snippet.enabledDevices && snippet.enabledDevices[deviceId]
			);
			checkbox.addEventListener("change", () => {
				if (!snippet.enabledDevices) snippet.enabledDevices = {};
				snippet.enabledDevices[deviceId] = checkbox.checked;
				void plugin.saveSettings().then(() => {
					updateJsSnippets(getSnippetSource(plugin));
					if (isCurrentDevice) {
						currentToggle.checked = checkbox.checked;
					}
				});
			});

			const labelText = isCurrentDevice
				? `${device.name} (this)`
				: device.name;
			toggleWrapper.createEl("label", {
				text: labelText,
				attr: {
					for: `js-snippet-${snippet.id}-${deviceId}`,
					title: `${device.type} - ${deviceId.substring(0, 8)}...`,
				},
			});
		}

		const jsPreview = details.createDiv("ds-snippet-css-preview");
		jsPreview.createEl("label", { text: "JavaScript:" });
		const codeEl = jsPreview.createEl("pre");
		codeEl.createEl("code", {
			text:
				snippet.js.substring(0, 500) + (snippet.js.length > 500 ? "..." : ""),
		});
	}
}

class ConfirmModal extends Modal {
	private resolved = false;
	constructor(app: App, private message: string, private onConfirm: () => void) {
		super(app);
	}
	onOpen() {
		this.contentEl.createEl("p", { text: this.message });
		new Setting(this.contentEl)
			.addButton(b => b.setButtonText("Confirm").setCta().onClick(() => { this.resolved = true; this.close(); this.onConfirm(); }))
			.addButton(b => b.setButtonText("Cancel").onClick(() => this.close()));
	}
	onClose() { this.contentEl.empty(); }
}
