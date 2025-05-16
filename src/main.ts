import { App, Notice, Plugin } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import SettingsTab from "./views/SettingsTab";
import { PluginSettings } from "./types";
import { SyncService } from "./services/SyncService";
import { MetadataService } from "./services/MetadataService";
import { FileUtils } from "./utils/FileUtils";
import { NoteService } from "./services/NoteService";
import { DEFAULT_SETTINGS, IS_DEV } from "./config";

export default class ObsidianHardcover extends Plugin {
	settings: PluginSettings;
	hardcoverAPI: HardcoverAPI;
	metadataService: MetadataService;
	noteService: NoteService;
	fileUtils: FileUtils;
	syncService: SyncService;

	async onload() {
		// TODO: remove after dev
		if (IS_DEV) {
			console.log("Development mode");
		} else {
			console.log("Running production build");
		}

		await this.loadSettings();

		// Init services
		this.hardcoverAPI = new HardcoverAPI(this.settings);
		this.fileUtils = new FileUtils();
		this.metadataService = new MetadataService(this.settings);
		this.noteService = new NoteService(this.app.vault, this.fileUtils, this);

		// Instantiate main service
		this.syncService = new SyncService(this);

		// Add a settings tab to configure the plugin
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.hardcoverAPI.updateSettings(this.settings);
		this.metadataService.updateSettings(this.settings);
	}

	async resetSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		await this.saveSettings();
		new Notice("Settings reset to defaults");
	}
}
