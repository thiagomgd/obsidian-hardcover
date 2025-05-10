import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import ObsidianHardcover from "src/main";

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianHardcover;

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
	}

	// TODO: improve UI labels and descriptions

	private renderSyncSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Sync Hardcover library")
			.addButton((button: ButtonComponent) => {
				button.setButtonText("Sync Now");
				button.onClick(() => {
					console.log("clicked!");
				});
				button.setCta();
			});
	}

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
		new Setting(containerEl)
			.setName("Hardcover user ID")
			.setDesc(
				"Your Hardcover user ID. It will be added automatically when you first run the synchronization."
			)
			.addText((text) => text.setDisabled(true));
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

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.renderApiTokenSetting(containerEl);
		this.renderUserIdSetting(containerEl);
		this.renderLastSyncTimestampSetting(containerEl);
		this.renderSyncSetting(containerEl);
	}
}
