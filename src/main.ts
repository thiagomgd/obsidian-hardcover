import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import SettingsTab from "./views/SettingsTab";

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

		// Add a settings tab to configure the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		// Init Hardcover API service with settings
		this.hardcoverAPI = new HardcoverAPI(this.settings);

		this.addCommand({
			id: "fetch-library",
			name: "Fetch Library",
			callback: async () => {
				try {
					const data = await this.hardcoverAPI.fetchLibrary();
				} catch (error) {
					console.error("Error in API request:", error);
				}
			},
		});
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
