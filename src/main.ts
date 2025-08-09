import { App, Notice, Plugin } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import SettingsTab from "./views/SettingsTab";
import { PluginSettings } from "./types";
import { SyncService } from "./services/SyncService";
import { GroupSyncService } from "./services/GroupSyncService";
import { MetadataService } from "./services/MetadataService";
import { FileUtils } from "./utils/FileUtils";
import { NoteService } from "./services/NoteService";
import { IS_DEV } from "./config/constants";
import { DEFAULT_SETTINGS } from "./config/defaultSettings";
import { SettingsMigrationService } from "./services/SettingsMigrationService";

export default class ObsidianHardcover extends Plugin {
	settings: PluginSettings;
	hardcoverAPI: HardcoverAPI;
	metadataService: MetadataService;
	noteService: NoteService;
	fileUtils: FileUtils;
	syncService: SyncService;
	groupSyncService: GroupSyncService;

	async onload() {
		if (IS_DEV) {
			console.log("Development mode");
		}

		await this.loadSettings();

		// Init services
		this.hardcoverAPI = new HardcoverAPI(this.settings);
		this.fileUtils = new FileUtils();
		this.metadataService = new MetadataService(this.settings);
		this.noteService = new NoteService(this.app.vault, this.app.fileManager, this.app.metadataCache, this.fileUtils, this);

		// Instantiate main service
		this.syncService = new SyncService(this);
		this.groupSyncService = new GroupSyncService(this);

		// Add command palette command
		this.addCommand({
			id: "sync-hardcover-library",
			name: "Sync Hardcover library",
			callback: () => {
				this.triggerSync();
			},
		});

		this.addCommand({
			id: "group-sync-hardcover-library",
			name: "Group Sync Hardcover library",
			callback: () => {
				this.triggerGroupSync();
			},
		});

		this.addRibbonIcon("book", "Sync Hardcover library", () => {
			this.triggerSync();
		});

		// Add a settings tab to configure the plugin
		this.addSettingTab(new SettingsTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		const savedData = await this.loadData();

		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);

		// check if migration is needed
		if (
			!savedData ||
			typeof savedData.settingsVersion === "undefined" ||
			savedData.settingsVersion < DEFAULT_SETTINGS.settingsVersion
		) {
			console.log(
				`Settings migration needed: from settings version ${
					savedData?.settingsVersion || "none"
				} to ${DEFAULT_SETTINGS.settingsVersion}`
			);

			// apply migrations
			this.settings = SettingsMigrationService.migrateSettings(this.settings);

			// save the migrated settings
			await this.saveSettings();
			console.log("Settings migration completed and saved");
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);

		// only update if services are initialized
		if (this.hardcoverAPI) {
			this.hardcoverAPI.updateSettings(this.settings);
		}
		if (this.metadataService) {
			this.metadataService.updateSettings(this.settings);
		}
	}

	async resetSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		await this.saveSettings();
		new Notice("Settings reset to defaults");
	}

	validateSyncConstraints(): { isValid: boolean; errorMessage?: string } {
		const targetFolder = this.settings.targetFolder;
		const isRootOrEmpty = this.fileUtils.isRootOrEmpty(targetFolder);

		const apiKey = this.settings.apiKey;
		const isApiKeyMissing = !apiKey || apiKey.trim() === "";

		if (isRootOrEmpty) {
			return {
				isValid: false,
				errorMessage:
					"Please specify a target folder in settings. Using the vault root is not allowed.",
			};
		}

		if (isApiKeyMissing) {
			return {
				isValid: false,
				errorMessage: "Please enter your Hardcover API key in settings.",
			};
		}

		return { isValid: true };
	}

	private async triggerSync(): Promise<void> {
		const validation = this.validateSyncConstraints();

		if (!validation.isValid) {
			new Notice(validation.errorMessage || "Sync validation failed");
			return;
		}

		try {
			await this.syncService.startSync();
		} catch (error) {
			console.error("Sync failed:", error);
		}
	}

	private async triggerGroupSync(): Promise<void> {
		const validation = this.validateSyncConstraints();

		if (!validation.isValid) {
			new Notice(validation.errorMessage || "Sync validation failed");
			return;
		}

		try {
			console.log("Starting group sync process...");
			await this.groupSyncService.startSync();
			// await this.groupSyncService.startSync({debugLimit:50});
		} catch (error) {
			console.error("Group Sync failed:", error);
		}
	}
}
