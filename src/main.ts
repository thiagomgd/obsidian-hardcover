import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import SettingsTab from "./views/SettingsTab";
import { DEFAULT_FIELDS_SETTINGS, PluginSettings } from "./types";
import { SyncService } from "./services/SyncService";

const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: "",
  lastSyncTimestamp: "",
  userId: null,
  booksCount: null,
  fieldsSettings: DEFAULT_FIELDS_SETTINGS,
  dataSourcePreferences: {
    titleSource: "edition",
    coverSource: "edition",
    releaseDateSource: "edition",
  },
};

export default class ObsidianHardcover extends Plugin {
  settings: PluginSettings;
  syncService: SyncService;
  hardcoverAPI: HardcoverAPI;

  async onload() {
    await this.loadSettings();

    // Init Hardcover API service with settings
    this.hardcoverAPI = new HardcoverAPI(this.settings);
    // Instantiate main service
    this.syncService = new SyncService(this);

    // Add a settings tab to configure the plugin
    this.addSettingTab(new SettingsTab(this.app, this));

    // this.addCommand({
    // 	id: "fetch-library",
    // 	name: "Fetch Library",
    // 	callback: async () => {
    // 		try {
    // 			const data = await this.hardcoverAPI.fetchLibrary();
    // 		} catch (error) {
    // 			console.error("Error in API request:", error);
    // 		}
    // 	},
    // });
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
