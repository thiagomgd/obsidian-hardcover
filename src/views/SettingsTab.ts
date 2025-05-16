import { App, ButtonComponent, PluginSettingTab, Setting } from "obsidian";
import { CONTENT_DELIMITER, HARDCOVER_STATUS_MAP, IS_DEV } from "src/config";
import ObsidianHardcover from "src/main";
import {
	ActivityDateFieldConfig,
	FieldDefinition,
	FieldsSettings,
} from "src/types";

interface SyncButtonConfig {
	containerEl: HTMLElement;
	name?: string;
	description?: string;
	buttonText?: string;
	debugLimit?: number;
	showLimitInput?: boolean;
	settingClassName?: string;
	isMainCTA?: boolean;
}

export default class SettingsTab extends PluginSettingTab {
	plugin: ObsidianHardcover;
	SYNC_CTA_LABEL: string;
	chevronIcon: string;
	debugBookLimit: number;
	private syncButtons: ButtonComponent[] = [];

	constructor(app: App, plugin: ObsidianHardcover) {
		super(app, plugin);
		this.plugin = plugin;
		this.SYNC_CTA_LABEL = "Sync now";
		this.chevronIcon = `<svg viewBox="0 0 8 13" width="8" height="13" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 1.5l5 5-5 5" stroke="currentColor" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
		this.debugBookLimit = 1;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("obhc-settings");

		this.syncButtons = [];

		containerEl.createEl("h2", { text: "Obsidian Hardcover Plugin" });

		// sync button
		this.addSyncButton({
			containerEl: containerEl,
			name: "Sync Hardcover library",
			description:
				"Sync your Hardcover books to Obsidian notes. For testing, you can sync a limited number of books in the Debug section below.",
			buttonText: this.SYNC_CTA_LABEL,
			isMainCTA: true,
		});

		containerEl.createEl("div", {
			text: `Note: Content below the ${CONTENT_DELIMITER} delimiter in your notes will be preserved during syncs. It's still recommended to maintain backups of your vault.`,
			cls: "setting-item-description sync-setting-note",
		});

		// API section
		this.renderApiTokenSetting(containerEl);

		// files section
		this.renderFolderSetting(containerEl);
		this.renderFilenameTemplateSetting(containerEl);

		// sync section
		this.renderLastSyncTimestampSetting(containerEl);

		containerEl.createEl("hr");

		// fields section
		containerEl.createEl("h2", {
			text: "Configure the data to include in your book notes.",
		});
		this.renderFieldSettings(containerEl);

		containerEl.createEl("hr");

		// debug section
		this.renderDebugInfo(containerEl);

		// show developer options in dev mode
		if (IS_DEV) {
			containerEl.createEl("h2", { text: "Developer Options" });
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
						this.updateSyncButtonsState();
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

					this.updateSyncButtonsState();
				});
		});
	}

	private renderLastSyncTimestampSetting(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setName("Last Sync Timestamp")
			.setDesc(
				"When provided, only books updated on Hardcover after this timestamp will be synced. Leave empty to sync your entire library. Example format: 2025-01-01T18:30:35.519934+00:00"
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

	private addSyncButton(config: SyncButtonConfig): ButtonComponent {
		const {
			containerEl,
			name = "Sync",
			description = "Sync Hardcover books to Obsidian",
			buttonText = "Sync",
			debugLimit,
			showLimitInput = false,
			settingClassName,
			isMainCTA = false,
		} = config;

		const setting = new Setting(containerEl).setName(name).setDesc(description);

		if (settingClassName) {
			setting.setClass(settingClassName);
		}

		let limitInputValue = debugLimit;
		if (showLimitInput) {
			setting.addText((text) => {
				text
					.setPlaceholder("1")
					.setValue(String(debugLimit || this.debugBookLimit))
					.onChange((value) => {
						limitInputValue = parseInt(value) || 1;
						if (!debugLimit) {
							this.debugBookLimit = limitInputValue;
						}
					});
			});
		}

		let button!: ButtonComponent;

		setting.addButton((btn) => {
			button = btn;
			btn.setButtonText(buttonText);
			btn.onClick(async () => {
				// Show loading state
				btn.setButtonText("Syncing...");
				btn.setDisabled(true);

				try {
					const options = limitInputValue
						? { debugLimit: limitInputValue }
						: {};
					await this.plugin.syncService.startSync(options);

					if (showLimitInput) {
						this.display();
					}
				} catch (error) {
					console.error("Sync failed:", error);
				} finally {
					// Reset button state
					btn.setButtonText(buttonText);
					btn.setDisabled(false);
				}
			});

			// turn main button into obsidian cta
			if (isMainCTA) {
				btn.setCta();
			}

			this.syncButtons.push(btn);
		});

		this.updateSyncButtonsState();

		return button;
	}

	private updateSyncButtonsState() {
		const targetFolder = this.plugin.settings.targetFolder;
		const isRootOrEmpty = this.plugin.fileUtils.isRootOrEmpty(targetFolder);

		const apiKey = this.plugin.settings.apiKey;
		const isApiKeyMissing = !apiKey || apiKey.trim() === "";

		const isDisabled = isRootOrEmpty || isApiKeyMissing;
		let tooltipText = "";

		if (isRootOrEmpty) {
			tooltipText =
				"Please specify a target folder. Using the vault root is not allowed";
		}

		if (isApiKeyMissing) {
			tooltipText = tooltipText
				? `${tooltipText}. Please enter your Hardcover API key`
				: "Please enter your Hardcover API key";
		}

		for (const button of this.syncButtons) {
			button.setDisabled(isDisabled);
			button.setTooltip(tooltipText);
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

		this.addSyncButton({
			containerEl: debugContent,
			name: "Test Sync",
			description:
				"Sync a limited number of books to test the plugin before doing a full sync",
			buttonText: "Run",
			debugLimit: this.debugBookLimit,
			showLimitInput: true,
			settingClassName: "obhc-test-sync",
		});
	}

	private renderDevOptions(containerEl: HTMLElement) {
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

	private renderAccordionField(
		containerEl: HTMLElement,
		field: FieldDefinition
	) {
		const fieldSettings = this.plugin.settings.fieldsSettings[field.key];
		const isEnabled = fieldSettings.enabled;

		const accordionContainer = containerEl.createDiv({ cls: "obhc-accordion" });

		const header = accordionContainer.createDiv({
			cls: "obhc-accordion-header",
		});

		const icon = header.createSpan({ cls: "obhc-accordion-icon" });
		icon.innerHTML = this.chevronIcon;

		header.createSpan({ text: field.name });

		if (field.key !== "title") {
			const toggleSetting = new Setting(header);
			toggleSetting.addToggle((toggle) => {
				toggle.setValue(isEnabled).onChange(async (value) => {
					this.plugin.settings.fieldsSettings[field.key].enabled = value;
					await this.plugin.saveSettings();

					if (content) {
						if (value) {
							content.removeClass("obhc-disabled-settings");
						} else {
							content.addClass("obhc-disabled-settings");
						}
					}
				});
			});

			toggleSetting.settingEl.addClass("obhc-field-toggle");
			toggleSetting.nameEl.remove();
			toggleSetting.descEl.remove();
		}

		const contentWrapper = accordionContainer.createDiv({
			cls: "obhc-accordion-content",
		});
		const content = contentWrapper.createDiv({
			cls: isEnabled ? "" : "obhc-disabled-settings",
		});

		header.addEventListener("click", (e) => {
			if (
				e.target &&
				(e.target as HTMLElement).closest(".checkbox-container")
			) {
				return;
			}

			icon.classList.toggle("expanded");
			contentWrapper.classList.toggle("expanded");
		});

		this.addFieldSettings(content, field);

		return accordionContainer;
	}

	private addFieldSettings(containerEl: HTMLElement, field: FieldDefinition) {
		const fieldSettings = this.plugin.settings.fieldsSettings[field.key];

		if (field.key !== "firstRead" && field.key !== "lastRead") {
			new Setting(containerEl)
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

			new Setting(containerEl)
				.setName("Get from book")
				.setDesc(
					`By default all data will be retrieved from Editions. Turn this on to get the ${field.name} from the Book instead.`
				)
				.addToggle((toggle) => {
					toggle.setValue(currentSource === "book").onChange(async (value) => {
						this.plugin.settings.dataSourcePreferences[sourceKey] = value
							? "book"
							: "edition";
						await this.plugin.saveSettings();
					});
				});
		}

		if (field.key === "firstRead" || field.key === "lastRead") {
			this.addActivityDatePropertyField(
				containerEl,
				field.key,
				"start",
				field.name
			);
			this.addActivityDatePropertyField(
				containerEl,
				field.key,
				"end",
				field.name
			);
		}

		if (field.key === "status") {
			containerEl.createEl("p", {
				text: "Customize how Hardcover statuses appear in your notes.",
				attr: { style: "margin-top: 15px; margin-bottom: 10px;" },
			});

			this.renderStatusMappingSettings(containerEl);
		}
	}

	private renderFieldSettings(containerEl: HTMLElement) {
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

		fields.forEach((field) => {
			this.renderAccordionField(fieldGroupsContainer, field);
		});
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
