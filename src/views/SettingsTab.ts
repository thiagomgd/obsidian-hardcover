import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import ObsidianHardcover from "src/main";

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianHardcover;
	SYNC_CTA_LABEL: string;

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
		this.SYNC_CTA_LABEL = "Sync now";
	}

	// TODO: improve UI labels and descriptions
	// TODO: extract all text to variables

	private renderApiTokenSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Hardcover API key")
			.setDesc("Get your API key from https://hardcover.app/account/api")
			.addText((text) =>
				text
					.setPlaceholder("Enter your API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderUserIdSetting(containerEl: HTMLElement) {
		const userIdSetting = new Setting(containerEl)
			.setName("Hardcover user ID")
			.setDesc(
				this.plugin.settings.userId
					? "Your Hardcover user ID has been retrieved."
					: "Your Hardcover user ID. It will be added automatically when you first run the synchronization."
			);

		if (this.plugin.settings.userId) {
			userIdSetting.addText((text) =>
				text
					.setValue(String(this.plugin.settings.userId))
					.setDisabled(true)
			);
		} else {
			userIdSetting.addText((text) =>
				text.setPlaceholder("1234").setDisabled(true)
			);
		}
	}

	private renderLastSyncTimestampSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Last Sync Timestamp")
			.setDesc(
				"The timestamp relative to when the last synchronization was run. Format: YYYY-MM-DD'T'HH:mm:ss.SSSSSSXXX" // TODO: explain how timestamp is used in filters
			)
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD'T'HH:mm:ss.SSSSSSXXX")
					.onChange(async (value) => {
						this.plugin.settings.lastSyncTimestamp = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderSyncSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Sync Hardcover library")
			.addButton((button: ButtonComponent) => {
				button.setButtonText(this.SYNC_CTA_LABEL);
				button.onClick(async () => {
					// Show loading state
					button.setButtonText("Syncing...");
					button.setDisabled(true);

					try {
						await this.plugin.syncService.startSync();

						// Refresh the entire settings display after sync
						this.display();
					} catch (error) {
						console.error("Sync failed:", error);
					} finally {
						// Reset button state
						button.setButtonText(this.SYNC_CTA_LABEL);
						button.setDisabled(false);
					}
				});
				button.setCta();
			});
	}

	private renderClearId(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("DEBUG: clear user id")
			.addButton((button: ButtonComponent) => {
				button.setButtonText("Clear");
				button.onClick(async () => {
					this.plugin.settings.userId = "";
					await this.plugin.saveSettings();
				});
				button.setCta();
			});
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.renderApiTokenSetting(containerEl);
		this.renderUserIdSetting(containerEl);
		this.renderLastSyncTimestampSetting(containerEl);
		this.renderSyncSetting(containerEl);

		// For debug purposes
		this.renderClearId(containerEl);
	}
}
