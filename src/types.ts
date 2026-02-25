export type SnippetDeviceMap = Record<string, boolean>;

export interface SnippetBase {
	id: string;
	name: string;
	enabledDevices?: SnippetDeviceMap;
}

export interface CssSnippet extends SnippetBase {
	css: string;
}

export interface JsSnippet extends SnippetBase {
	js: string;
}

export interface KnownDeviceEntry {
	id: string;
	type: string;
	typeLabel: string;
	name: string;
	lastSeen?: number;
}

export interface DeviceInfo {
	id: string;
	type: string;
	typeLabel: string;
}
