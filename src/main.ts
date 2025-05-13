import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import SettingsTab from "./views/SettingsTab";
import { DEFAULT_FIELDS_SETTINGS, PluginSettings } from "./types";
import { SyncService } from "./services/SyncService";
import { MetadataService } from "./services/MetadataService";
import { FileUtils } from "./utils/FileUtils";
import { NoteService } from "./services/NoteService";

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
	hardcoverAPI: HardcoverAPI;
	metadataService: MetadataService;
	noteService: NoteService;
	fileUtils: FileUtils;
	syncService: SyncService;

	async onload() {
		await this.loadSettings();
		this.loadStyles();

		// Init services
		this.hardcoverAPI = new HardcoverAPI(this.settings);
		this.fileUtils = new FileUtils();
		this.metadataService = new MetadataService(this.settings);
		this.noteService = new NoteService(this.app.vault, this.fileUtils);

		// Instantiate main service
		this.syncService = new SyncService(this);

		// Add a settings tab to configure the plugin
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload() {
		const styleEl = document.getElementById("obsidian-hardcover-plugin-styles");
		if (styleEl) styleEl.remove();
	}

	async loadStyles() {
		const styleEl = document.createElement("style");
		styleEl.id = "obsidian-hardcover-plugin-styles";
		styleEl.textContent = `
    .obhc-settings .field-groups-container {
		}
		.obhc-settings .field-separator {
			margin: 1.2rem 0;
		}
		.obhc-settings .nested-settings {
			margin-left: 0;
		}
		.obhc-settings .setting-item:last-of-type {
			padding-bottom: 0;
		}
		.obhc-settings .mod-toggle {
			border: none;
		}
  `;
		document.head.appendChild(styleEl);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.hardcoverAPI.updateSettings(this.settings);
		this.metadataService.updateSettings(this.settings);
	}
}
