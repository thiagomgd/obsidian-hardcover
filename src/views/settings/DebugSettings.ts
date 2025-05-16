import { ButtonComponent, Setting } from "obsidian";
import ObsidianHardcover from "src/main";
import { addSyncButton } from "./SyncSettings";

export function renderDebugInfo(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover,
	debugBookLimit: number,
	updateSyncButtonsState: () => void,
	onDebugLimitChanged: (limit: number) => void,
	onSyncComplete: () => void
): ButtonComponent {
	const debugDetails = containerEl.createEl("details", {
		cls: "obhc-debug-details",
	});

	debugDetails.createEl("summary", {
		text: "Debug Information",
		cls: "obhc-debug-summary",
	});

	const debugContent = debugDetails.createEl("div", {
		cls: "obhc-debug-content",
	});

	const infoContainer = debugContent.createEl("div", {
		cls: "obhc-debug-info-container",
	});

	infoContainer.createEl("div", {
		text: `Hardcover User ID: ${plugin.settings.userId || "Not set"}`,
		cls: "obhc-debug-info-item",
	});

	infoContainer.createEl("div", {
		text: `Total Hardcover Books Count: ${
			plugin.settings.booksCount || "Unknown"
		}`,
		cls: "obhc-debug-info-item",
	});

	const button = addSyncButton({
		containerEl: debugContent,
		plugin: plugin,
		name: "Test Sync",
		description:
			"Sync a limited number of books to test the plugin before doing a full sync",
		buttonText: "Run",
		debugLimit: debugBookLimit,
		showLimitInput: true,
		settingClassName: "obhc-test-sync",
		updateSyncButtonsState: updateSyncButtonsState,
		onDebugLimitChanged: onDebugLimitChanged,
		onSyncComplete: onSyncComplete,
	});

	return button;
}

export function renderDevOptions(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover
): void {
	new Setting(containerEl)
		.setName("Reset Plugin")
		.setDesc("Reset plugin settings to defaults")
		.addButton((button) => {
			button
				.setButtonText("Reset Settings")
				.setWarning()
				.onClick(async () => {
					const confirmed = confirm(
						"Are you sure you want to reset all plugin settings to defaults? This cannot be undone."
					);

					if (confirmed) {
						await plugin.resetSettings();
					}
				});
		});
}
