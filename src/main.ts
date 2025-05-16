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
		this.loadStyles();

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
		.obhc-settings .sync-setting-note {
			margin-bottom: 10px;
			font-style: italic;
		}	
		.obhc-settings .mod-toggle {
			border: none;
		}
		.obhc-settings .has-error {
			border-color: var(--text-error) !important;
		}
		.obhc-accordion {
			margin-bottom: 8px;
			border: 1px solid var(--background-modifier-border);
			border-radius: 4px;
		}
		.obhc-accordion-header {
			display: flex;
			align-items: center;
			cursor: pointer;
			padding: 5px;
			border-radius: 4px 4px 0 0;
		}
		.obhc-accordion-header:hover {
			background-color: var(--interactive-hover);
		}
		.obhc-accordion-icon {
			margin-right: 8px;
			transition: transform 0.2s ease;
		}
		.obhc-accordion-icon.expanded {
			transform: rotate(90deg);
		}
		.obhc-accordion-content {
			padding: 8px;
			display: none;
			border-top: 1px solid var(--background-modifier-border);
		}
		.obhc-accordion-content.expanded {
			display: block;
		}
		.obhc-field-toggle {
			margin-left: auto !important;
			padding: 0 !important;
			border: none !important;
		}
		.obhc-field-toggle .checkbox-container {
			margin: 0 !important;
		}
		.obhc-field-label {
			font-size: 1em;
			margin-right: 10px;
		}

		/* Debug section styles */
    .obhc-debug-details {
      margin-top: 1rem;
      border: 1px solid var(--background-modifier-border);
      padding: 0.5rem;
      margin-bottom: 1rem;
    }
    .obhc-debug-summary {
      cursor: pointer;
      font-weight: 600;
    }
    .obhc-debug-content {
      margin-top: 0.5rem;
    }
    .obhc-debug-info-container {
      margin-bottom: 1rem;
      padding: 0.5rem;
      background-color: var(--background-secondary);
    }
    .obhc-debug-info-item {
      font-family: var(--font-monospace);
      font-size: 0.9em;
    }
		.obhc-test-sync input {
			width: 50px;
			text-align: center;
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

	async resetSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS);
		await this.saveSettings();
		new Notice("Settings reset to defaults");
	}
}
