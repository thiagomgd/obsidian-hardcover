import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";

export interface PluginSettings {
	apiKey: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: "",
};

export default class ObsidianHardcover extends Plugin {
	settings: PluginSettings;
	hardcoverAPI: HardcoverAPI;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// Init API service with settings
		this.hardcoverAPI = new HardcoverAPI(this.settings);

		this.addCommand({
			id: "fetch-identity",
			name: "Fetch identity",
			callback: async () => {
				try {
					console.log("callback called");
					const data = await this.hardcoverAPI.fetchData();
				} catch (error) {
					console.error("Error in API request:", error);
				}
			},
		});

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianHardcover;

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

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
}
