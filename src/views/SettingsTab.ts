import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import ObsidianHardcover from "src/main";

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianHardcover;

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
	}

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

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.renderApiTokenSetting(containerEl);
		this.renderSyncSetting(containerEl);
	}
}
