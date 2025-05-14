import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
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

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
		this.SYNC_CTA_LABEL = "Sync now";
		this.debugBookLimit = 1;
	}

	// TODO: improve UI labels and descriptions
	// TODO: extract all text to variables

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
		const userIdSetting = new Setting(containerEl)
			.setName("Hardcover user ID")
			.setDesc(
				this.plugin.settings.userId
					? "Your Hardcover user ID has been retrieved."
					: "Your Hardcover user ID. It will be added automatically when you first run the synchronization."
			);

		if (this.plugin.settings.userId) {
			userIdSetting.addText((text) =>
				text.setValue(String(this.plugin.settings.userId)).setDisabled(true)
			);
		} else {
			userIdSetting.addText((text) =>
				text.setPlaceholder("1234").setDisabled(true)
			);
		}
	}

	private renderBooksCountSetting(containerEl: HTMLElement) {
		const userIdSetting = new Setting(containerEl)
			.setName("Hardcover Books Count")
			.setDesc("Your total count of books on Hardcover - used for pagination");

		if (this.plugin.settings.booksCount) {
			userIdSetting.addText((text) =>
				text.setValue(String(this.plugin.settings.booksCount)).setDisabled(true)
			);
		} else {
			userIdSetting.addText((text) =>
				text.setPlaceholder("1234").setDisabled(true)
			);
		}
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

	private renderSyncSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Sync Hardcover library")
			.addButton((button: ButtonComponent) => {
				button.setButtonText(this.SYNC_CTA_LABEL);
				button.onClick(async () => {
					// Show loading state
					button.setButtonText("Syncing...");
					button.setDisabled(true);

					try {
						await this.plugin.syncService.startSync();

						// Refresh the entire settings display after sync
						this.display();
					} catch (error) {
						console.error("Sync failed:", error);
					} finally {
						// Reset button state
						button.setButtonText(this.SYNC_CTA_LABEL);
						button.setDisabled(false);
					}
				});
				button.setCta();
			});
	}

	private renderClearId(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("DEBUG: clear user id")
			.addButton((button: ButtonComponent) => {
				button.setButtonText("Clear");
				button.onClick(async () => {
					this.plugin.settings.userId = null;
					await this.plugin.saveSettings();
					// Refresh to show changes
					this.display();
				});
				button.setCta();
			});
	}

	private renderFieldSettings(containerEl: HTMLElement) {
		containerEl.createEl("h2", { text: "Configuration" });
		containerEl.createEl("p", {
			text: "Decide what data you want to retrieve from Hardcover to populate the frontmatter properties of your notes.",
		});
		containerEl.createEl("hr", { cls: "field-separator" });

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

	private renderDebugSettings(containerEl: HTMLElement) {
		containerEl.createEl("h3", { text: "Debug Options" });

		new Setting(containerEl)
			.setName("Debug: Sync with limited books")
			.setDesc("Run the sync with only a few books to test the full process")
			.addText((text) =>
				text
					.setPlaceholder("1")
					.setValue(String(this.debugBookLimit))
					.onChange(async (value) => {
						this.debugBookLimit = parseInt(value) || 1;
					})
			)
			.addButton((button) => {
				button.setButtonText("Debug Sync");
				button.onClick(async () => {
					// Show loading state
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
						// Reset button state
						button.setButtonText("Debug Sync");
						button.setDisabled(false);
					}
				});
			});
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.addClass("obhc-settings");

		this.renderApiTokenSetting(containerEl);
		this.renderLastSyncTimestampSetting(containerEl);
		this.renderSyncSetting(containerEl);

		// For debug purposes
		// TODO: evaluate if setting to toggle debug mode and display these settings can be useful
		this.renderUserIdSetting(containerEl);
		this.renderBooksCountSetting(containerEl);
		this.renderClearId(containerEl);
		this.renderDebugSettings(containerEl);

		// Field settings
		this.renderFieldSettings(containerEl);
	}
}
