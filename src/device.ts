import { Platform } from "obsidian";
import type { DeviceInfo } from "./types";

const DEVICE_TYPES: Record<string, string> = {
	IOS: "ios",
	IPAD: "ipad",
	ANDROID: "android",
	ANDROID_TABLET: "android-tablet",
	MACOS: "macos",
	WINDOWS: "windows",
	LINUX: "linux",
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
	[DEVICE_TYPES.IOS!]: "iPhone",
	[DEVICE_TYPES.IPAD!]: "iPad",
	[DEVICE_TYPES.ANDROID!]: "Android",
	[DEVICE_TYPES.ANDROID_TABLET!]: "Android Tablet",
	[DEVICE_TYPES.MACOS!]: "Mac",
	[DEVICE_TYPES.WINDOWS!]: "Windows",
	[DEVICE_TYPES.LINUX!]: "Linux",
};

const DEVICE_STORAGE_KEY = "dynamic-snippets-device-id";

function generateUniqueId(): string {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function getDeviceType(): string {
	if (Platform.isIosApp) {
		return Platform.isTablet ? DEVICE_TYPES.IPAD! : DEVICE_TYPES.IOS!;
	}
	if (Platform.isAndroidApp) {
		return Platform.isTablet ? DEVICE_TYPES.ANDROID_TABLET! : DEVICE_TYPES.ANDROID!;
	}
	if (Platform.isMacOS) return DEVICE_TYPES.MACOS!;
	if (Platform.isWin) return DEVICE_TYPES.WINDOWS!;
	if (Platform.isLinux) return DEVICE_TYPES.LINUX!;
	return Platform.isMobile ? DEVICE_TYPES.IOS! : DEVICE_TYPES.MACOS!;
}

function getOrCreateDeviceId(): string {
	let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
	if (!deviceId) {
		deviceId = generateUniqueId();
		localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
	}
	return deviceId;
}

export function getDeviceInfo(): DeviceInfo {
	const type = getDeviceType();
	const typeLabel = DEVICE_TYPE_LABELS[type] || type;
	return {
		id: getOrCreateDeviceId(),
		type,
		typeLabel,
	};
}
