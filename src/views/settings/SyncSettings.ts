import { ButtonComponent, Setting } from "obsidian";
import { CONTENT_DELIMITER } from "src/config/constants";
import ObsidianHardcover from "src/main";

export interface SyncButtonConfig {
	containerEl: HTMLElement;
	plugin: ObsidianHardcover;
	name?: string;
	description?: string;
	buttonText?: string;
	debugLimit?: number;
	showLimitInput?: boolean;
	onDebugLimitChanged?: (limit: number) => void;
	settingClassName?: string;
	isMainCTA?: boolean;
	updateSyncButtonsState: () => void;
}

export function addSyncButton(config: SyncButtonConfig): ButtonComponent {
	const {
		containerEl,
		plugin,
		name = "Sync",
		description = "Sync Hardcover books to Obsidian",
		buttonText = "Sync",
		debugLimit,
		showLimitInput = false,
		onDebugLimitChanged,
		settingClassName,
		isMainCTA = false,
		updateSyncButtonsState,
	} = config;

	const setting = new Setting(containerEl).setName(name).setDesc(description);

	if (settingClassName) {
		setting.setClass(settingClassName);
	}

	let limitInputValue = debugLimit;
	if (showLimitInput) {
		setting.addText((text) => {
			text
				.setPlaceholder("1")
				.setValue(String(debugLimit || 1))
				.onChange((value) => {
					limitInputValue = parseInt(value) || 1;
					if (onDebugLimitChanged) {
						onDebugLimitChanged(limitInputValue);
					}
				});
		});
	}

	let button!: ButtonComponent;

	setting.addButton((btn) => {
		button = btn;
		btn.setButtonText(buttonText);
		btn.onClick(async () => {
			// Show loading state
			btn.setButtonText("Syncing...");
			btn.setDisabled(true);

			try {
				const options = limitInputValue ? { debugLimit: limitInputValue } : {};
				await plugin.syncService.startSync(options);
			} catch (error) {
				console.error("Sync failed:", error);
			} finally {
				// Reset button state
				btn.setButtonText(buttonText);
				btn.setDisabled(false);
			}
		});

		// turn main button into obsidian cta
		if (isMainCTA) {
			btn.setCta();
		}
	});

	updateSyncButtonsState();

	return button;
}

export function renderLastSyncTimestampSetting(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover,
	onSettingsChanged: () => void
): void {
	new Setting(containerEl)
		.setName("Last Sync Timestamp")
		.setDesc(
			"When provided, only books updated on Hardcover after this timestamp will be synced. Leave empty to sync your entire library. Example format: 2025-01-01T18:30:35.519934+00:00"
		)
		.addExtraButton((button) => {
			button
				.setIcon("refresh-cw")
				.setTooltip("Reset timestamp (will force full sync)")
				.onClick(async () => {
					plugin.settings.lastSyncTimestamp = "";
					await plugin.saveSettings();
					onSettingsChanged();
				});
		})
		.addText((text) =>
			text
				.setPlaceholder("YYYY-MM-DD'T'HH:mm:ss.SSSSSSXXX")
				.setValue(plugin.settings.lastSyncTimestamp || "")
				.onChange(async (value) => {
					plugin.settings.lastSyncTimestamp = value;
					await plugin.saveSettings();
				})
		);
}

export function renderSyncDelimiterNote(containerEl: HTMLElement): void {
	containerEl.createEl("div", {
		text: `Note: Content below the ${CONTENT_DELIMITER} delimiter in your notes will be preserved during syncs. It's still recommended to maintain backups of your vault.`,
		cls: "setting-item-description sync-setting-note",
	});
}
