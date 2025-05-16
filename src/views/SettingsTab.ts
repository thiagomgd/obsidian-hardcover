import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import { CONTENT_DELIMITER, HARDCOVER_STATUS_MAP, IS_DEV } from "src/config";
import ObsidianHardcover from "src/main";
import {
	ActivityDateFieldConfig,
	FieldDefinition,
	FieldsSettings,
} from "src/types";

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianHardcover;
	SYNC_CTA_LABEL: string;
	debugBookLimit: number;
	private syncButton: ButtonComponent | null = null;

	private isDev = true; // TODO: detect dev mode

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
		this.SYNC_CTA_LABEL = "Sync now";
		this.debugBookLimit = 1;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("obhc-settings");

		// API section
		containerEl.createEl("h2", { text: "API Configuration" });
		this.renderApiTokenSetting(containerEl);

		// files section
		containerEl.createEl("h2", { text: "File Organization" });
		this.renderFolderSetting(containerEl);
		this.renderFilenameTemplateSetting(containerEl);

		// sync section
		containerEl.createEl("h2", { text: "Synchronization" });
		this.renderLastSyncTimestampSetting(containerEl);
		this.renderSyncSetting(containerEl);

		// fields section
		containerEl.createEl("h2", { text: "Data Fields" });
		this.renderFieldSettings(containerEl);

		// sebug section, always show basic info, conditionally show dev options
		containerEl.createEl("h2", { text: "Debug Information" });
		this.renderDebugInfo(containerEl);

		// show developer options in dev mode
		if (IS_DEV) {
			containerEl.createEl("h3", { text: "Developer Options" });
			this.renderDevOptions(containerEl);
		}
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

	private renderFilenameTemplateSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Filename template")
			.setDesc(
				"Pattern used to generate filenames. Available variables: ${title}, ${authors}, ${year}. Note: The variables ${authors} and ${year} will only work if you've enabled the Authors and Release Date fields in the settings below."
			)
			.addText((text) =>
				text
					.setPlaceholder("${title} - ${year}")
					.setValue(this.plugin.settings.filenameTemplate)
					.onChange(async (value) => {
						this.plugin.settings.filenameTemplate =
							value || "${title} - ${year}";
						await this.plugin.saveSettings();
					})
			);
	}

	private renderFolderSetting(containerEl: HTMLElement) {
		const baseDesc =
			"The folder where book notes will be stored (required, will be created if it doesn't exist)";

		const setting = new Setting(containerEl)
			.setName("Target Folder *")
			.setDesc(baseDesc);

		setting.addText((text) => {
			text
				.setPlaceholder("HardcoverBooks")
				.setValue(this.plugin.settings.targetFolder)
				.onChange(async (value) => {
					const isRootOrEmpty = this.plugin.fileUtils.isRootOrEmpty(value);

					if (isRootOrEmpty) {
						text.inputEl.addClass("has-error");
						setting.setDesc(
							`${baseDesc} - Please specify a subfolder. Using the vault root is not allowed.`
						);
					} else {
						text.inputEl.removeClass("has-error");
						setting.setDesc(baseDesc);
					}

					this.plugin.settings.targetFolder = value;
					await this.plugin.saveSettings();

					this.updateSyncButtonState();
				});
		});
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
					.setValue(this.plugin.settings.lastSyncTimestamp || "")
					.onChange(async (value) => {
						this.plugin.settings.lastSyncTimestamp = value;
						await this.plugin.saveSettings();
					})
			);
	}

	private renderSyncSetting(containerEl: HTMLElement) {
		const setting = new Setting(containerEl)
			.setName("Sync Hardcover library")
			.setDesc("Sync your Hardcover books to Obsidian notes");

		setting.addButton((button) => {
			// store the button reference
			this.syncButton = button;

			button.setButtonText(this.SYNC_CTA_LABEL);
			button.onClick(async () => {
				// Show loading state
				button.setButtonText("Syncing...");
				button.setDisabled(true);

				try {
					await this.plugin.syncService.startSync();
				} catch (error) {
					console.error("Sync failed:", error);
				} finally {
					// Reset button state
					button.setButtonText(this.SYNC_CTA_LABEL);
					button.setDisabled(false);
				}
			});
			button.setCta();

			this.updateSyncButtonState();
		});

		containerEl.createEl("div", {
			text: `Note: Content below the ${CONTENT_DELIMITER} delimiter in your notes will be preserved during syncs. It's still recommended to maintain backups of your vault.`,
			cls: "setting-item-description",
			attr: {
				style: "font-style: italic;",
			},
		});
	}

	private updateSyncButtonState() {
		if (this.syncButton) {
			const value = this.plugin.settings.targetFolder;

			const isRootOrEmpty = this.plugin.fileUtils.isRootOrEmpty(value);

			this.syncButton.setDisabled(isRootOrEmpty);

			if (isRootOrEmpty) {
				this.syncButton.setTooltip(
					"Please specify a target folder. Using the vault root is not allowed"
				);
			} else {
				this.syncButton.setTooltip("");
			}
		}
	}

	private renderDebugInfo(containerEl: HTMLElement) {
		const debugDetails = containerEl.createEl("details", {
			cls: "obhc-debug-details",
		});

		debugDetails.createEl("summary", {
			text: "Debug Information",
			cls: "obhc-debug-summary",
		});

		const debugContent = debugDetails.createEl("div", {
			cls: "obhc-debug-content",
		});

		const infoContainer = debugContent.createEl("div", {
			cls: "obhc-debug-info-container",
		});

		infoContainer.createEl("div", {
			text: `Hardcover User ID: ${this.plugin.settings.userId || "Not set"}`,
			cls: "obhc-debug-info-item",
		});

		infoContainer.createEl("div", {
			text: `Total Hardcover Books Count: ${
				this.plugin.settings.booksCount || "Unknown"
			}`,
			cls: "obhc-debug-info-item",
		});

		this.renderTestSyncSetting(debugContent);
	}

	private renderTestSyncSetting(containerEl: HTMLElement) {
		const testSyncSetting = new Setting(containerEl)
			.setName("Test Sync")
			.setDesc(
				"Sync a limited number of books to test the plugin before doing a full sync"
			)
			.addText((text) => {
				text
					.setPlaceholder("1")
					.setValue(String(this.debugBookLimit))
					.onChange((value) => {
						this.debugBookLimit = parseInt(value) || 1;
					});

				text.inputEl.style.width = "50px";
				text.inputEl.style.textAlign = "center";
			});

		testSyncSetting.addButton((button) => {
			button.setButtonText("Run");
			button.onClick(async () => {
				button.setButtonText("Syncing...");
				button.setDisabled(true);

				try {
					await this.plugin.syncService.startSync({
						debugLimit: this.debugBookLimit,
					});
					this.display();
				} catch (error) {
					console.error("Test sync failed:", error);
				} finally {
					button.setButtonText("Run");
					button.setDisabled(false);
				}
			});
		});
	}

	private renderDevOptions(containerEl: HTMLElement) {
		const debugSyncSetting = new Setting(containerEl)
			.setName("Debug Sync")
			.setDesc("Run a sync with limited number of books")
			.addText((text) => {
				text
					.setPlaceholder("1")
					.setValue(String(this.debugBookLimit))
					.onChange((value) => {
						this.debugBookLimit = parseInt(value) || 1;
					});

				text.inputEl.style.width = "50px";
				text.inputEl.style.textAlign = "center";
			});

		debugSyncSetting.addButton((button) => {
			button.setButtonText("Run");
			button.onClick(async () => {
				button.setButtonText("Syncing...");
				button.setDisabled(true);

				try {
					await this.plugin.syncService.startSync({
						debugLimit: this.debugBookLimit,
					});
					this.display();
				} catch (error) {
					console.error("Debug sync failed:", error);
				} finally {
					button.setButtonText("Run");
					button.setDisabled(false);
				}
			});
		});

		new Setting(containerEl)
			.setName("Reset Plugin")
			.setDesc("Reset plugin settings to defaults")
			.addButton((button) => {
				button
					.setButtonText("Reset Settings")
					.setWarning()
					.onClick(async () => {
						const confirmed = confirm(
							"Are you sure you want to reset all plugin settings to defaults? This cannot be undone."
						);

						if (confirmed) {
							await this.plugin.resetSettings();
							this.display();
						}
					});
			});
	}

	private renderFieldSettings(containerEl: HTMLElement) {
		containerEl.createEl("p", {
			text: "Configure which data to include in your book notes.",
		});

		const fields: FieldDefinition[] = [
			{
				key: "title",
				name: "Title",
				description: "Book title",
				hasDataSource: true,
			},
			{ key: "rating", name: "Rating", description: "Your rating" },
			{ key: "status", name: "Status", description: "Reading status" },
			{
				key: "cover",
				name: "Cover",
				description: "Book cover image",
				hasDataSource: true,
			},
			{ key: "authors", name: "Authors", description: "Book authors" },
			{
				key: "contributors",
				name: "Contributors",
				description: "Other contributors (translators, narrators, etc.)",
			},
			{
				key: "releaseDate",
				name: "Release Date",
				description: "Publication date",
				hasDataSource: true,
			},
			{
				key: "description",
				name: "Description",
				description: "Book description",
			},
			{ key: "url", name: "URL", description: "Hardcover URL" },
			{ key: "genres", name: "Genres", description: "Book genres" },
			{
				key: "series",
				name: "Series",
				description: "Series information",
			},
			{
				key: "publisher",
				name: "Publisher",
				description: "Publisher name",
			},
			{
				key: "firstRead",
				name: "First Read",
				description: "Start and end date of first read",
				isActivityDateField: true,
			},
			{
				key: "lastRead",
				name: "Last Read",
				description: "Start and end date of last read",
				isActivityDateField: true,
			},
			{
				key: "totalReads",
				name: "Total reads",
				description: "Times read",
			},
		];

		// create field groups div for better spacing
		const fieldGroupsContainer = containerEl.createDiv({
			cls: "field-groups-container",
		});

		fields.forEach((field, index) => {
			const fieldGroup = fieldGroupsContainer.createDiv({ cls: "field-group" });
			this.renderFieldSetting(fieldGroup, field);

			// add divider after each field except the last one
			if (index < fields.length - 1) {
				fieldGroupsContainer.createEl("hr", { cls: "field-separator" });
			}
		});
	}

	private renderFieldSetting(containerEl: HTMLElement, field: FieldDefinition) {
		const fieldSettings = this.plugin.settings.fieldsSettings[field.key];

		// Create a container for the main toggle
		const mainSetting = new Setting(containerEl)
			.setName(field.name)
			.setDesc(field.description);

		if (mainSetting.nameEl.textContent !== "Title") {
			mainSetting.addToggle((toggle) =>
				toggle.setValue(fieldSettings.enabled).onChange(async (value) => {
					this.plugin.settings.fieldsSettings[field.key].enabled = value;
					await this.plugin.saveSettings();
					// Refresh to show/hide property name field
					this.display();
				})
			);
		}

		// only show additional settings if the field is enabled
		if (fieldSettings.enabled) {
			const additionalSettingsContainer = containerEl.createDiv({
				cls: "nested-settings",
			});

			if (field.key !== "firstRead" && field.key !== "lastRead") {
				new Setting(additionalSettingsContainer)
					.setName("Property name")
					.setDesc(`Frontmatter property name for ${field.name.toLowerCase()}`)
					.addText((text) =>
						text
							.setPlaceholder(field.key)
							.setValue(fieldSettings.propertyName)
							.onChange(async (value) => {
								this.plugin.settings.fieldsSettings[field.key].propertyName =
									value || field.key;
								await this.plugin.saveSettings();
							})
					);
			}

			if (field.hasDataSource) {
				const sourceKey =
					`${field.key}Source` as keyof typeof this.plugin.settings.dataSourcePreferences;
				const currentSource =
					this.plugin.settings.dataSourcePreferences[sourceKey];

				new Setting(additionalSettingsContainer)
					.setName("Get from book")
					.setDesc(
						`By default all data will be retrieved from Editions. Turn this on to get the ${field.name} from the Book instead.`
					)
					.addToggle((toggle) => {
						toggle
							.setValue(currentSource === "book")
							.onChange(async (value) => {
								this.plugin.settings.dataSourcePreferences[sourceKey] = value
									? "book"
									: "edition";
								await this.plugin.saveSettings();
							})
							.setDisabled(
								!this.plugin.settings.fieldsSettings[field.key].enabled
							)
							.setTooltip(
								`Use ${currentSource === "book" ? "book" : "edition"} as source`
							);
					});
			}

			// add specific fields for date properties
			if (field.key === "firstRead" || field.key === "lastRead") {
				this.addActivityDatePropertyField(
					additionalSettingsContainer,
					field.key,
					"start",
					field.name
				);
				this.addActivityDatePropertyField(
					additionalSettingsContainer,
					field.key,
					"end",
					field.name
				);
			}

			// add specific fields for status property
			if (field.key === "status") {
				this.renderStatusMappingSettings(containerEl);
			}
		}
	}

	private addActivityDatePropertyField(
		containerEl: HTMLElement,
		fieldKey: keyof FieldsSettings,
		type: "start" | "end",
		fieldName: string
	) {
		const fieldSettings = this.plugin.settings.fieldsSettings[
			fieldKey
		] as ActivityDateFieldConfig;
		const propName = type === "start" ? "startPropertyName" : "endPropertyName";
		const defaultValue =
			type === "start" ? `${fieldKey}Start` : `${fieldKey}End`;

		new Setting(containerEl)
			.setName(`${type.charAt(0).toUpperCase() + type.slice(1)} date property`)
			.setDesc(`Property name for ${fieldName.toLowerCase()} ${type} date`)
			.addText((text) => {
				text
					.setPlaceholder(defaultValue)
					.setValue(fieldSettings[propName])
					.onChange(async (value) => {
						(
							this.plugin.settings.fieldsSettings[
								fieldKey
							] as ActivityDateFieldConfig
						)[propName] = value || defaultValue;
						await this.plugin.saveSettings();
					});
			});
	}

	private renderStatusMappingSettings(containerEl: HTMLElement) {
		containerEl.createEl("p", {
			text: "Customize how Hardcover statuses appear in your notes.",
		});

		const statusIds = Object.keys(HARDCOVER_STATUS_MAP).map((id) => Number(id));
		const statusLabels = Object.values(HARDCOVER_STATUS_MAP);

		statusIds.forEach((id, index) => {
			new Setting(containerEl)
				.setName(`${statusLabels[index]}`)
				.setDesc(`Custom text for Hardcover status "${statusLabels[index]}"`)
				.addText((text) =>
					text
						.setPlaceholder(statusLabels[index])
						.setValue(this.plugin.settings.statusMapping[id] || "")
						.onChange(async (value) => {
							this.plugin.settings.statusMapping[id] =
								value || statusLabels[index];
							await this.plugin.saveSettings();
						})
				);
		});
	}
}
