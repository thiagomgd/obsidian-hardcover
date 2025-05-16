import { Setting } from "obsidian";
import { FIELD_DEFINITIONS } from "src/config/fieldDefinitions";
import ObsidianHardcover from "src/main";
import {
	ActivityDateFieldConfig,
	FieldDefinition,
	FieldsSettings,
} from "src/types";
import { Accordion } from "../ui/Accordion";
import { renderStatusMappingSettings } from "./StatusMappingSettings";

export function renderFieldSettings(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover,
	accordion: Accordion
): void {
	containerEl.createEl("h2", {
		text: "Configure the data to include in your book notes.",
	});

	// create field groups div for better spacing
	const fieldGroupsContainer = containerEl.createDiv({
		cls: "field-groups-container",
	});

	FIELD_DEFINITIONS.forEach((field) => {
		const contentEl = accordion.renderAccordionField(
			fieldGroupsContainer,
			field
		);
		addFieldSettings(contentEl, field, plugin);
	});
}

function addFieldSettings(
	containerEl: HTMLElement,
	field: FieldDefinition,
	plugin: ObsidianHardcover
): void {
	const fieldSettings = plugin.settings.fieldsSettings[field.key];

	if (field.key !== "firstRead" && field.key !== "lastRead") {
		new Setting(containerEl)
			.setName("Property name")
			.setDesc(`Frontmatter property name for ${field.name.toLowerCase()}`)
			.addText((text) =>
				text
					.setPlaceholder(field.key)
					.setValue(fieldSettings.propertyName)
					.onChange(async (value) => {
						plugin.settings.fieldsSettings[field.key].propertyName =
							value || field.key;
						await plugin.saveSettings();
					})
			);
	}

	if (field.hasDataSource) {
		const sourceKey =
			`${field.key}Source` as keyof typeof plugin.settings.dataSourcePreferences;
		const currentSource = plugin.settings.dataSourcePreferences[sourceKey];

		new Setting(containerEl)
			.setName("Get from book")
			.setDesc(
				`By default all data will be retrieved from Editions. Turn this on to get the ${field.name} from the Book instead.`
			)
			.addToggle((toggle) => {
				toggle.setValue(currentSource === "book").onChange(async (value) => {
					plugin.settings.dataSourcePreferences[sourceKey] = value
						? "book"
						: "edition";
					await plugin.saveSettings();
				});
			});
	}

	if (field.key === "firstRead" || field.key === "lastRead") {
		addActivityDatePropertyField(
			containerEl,
			field.key,
			"start",
			field.name,
			plugin
		);
		addActivityDatePropertyField(
			containerEl,
			field.key,
			"end",
			field.name,
			plugin
		);
	}

	if (field.key === "status") {
		containerEl.createEl("p", {
			text: "Customize how Hardcover statuses appear in your notes.",
			attr: { style: "margin-top: 15px; margin-bottom: 10px;" },
		});

		renderStatusMappingSettings(containerEl, plugin);
	}
}

function addActivityDatePropertyField(
	containerEl: HTMLElement,
	fieldKey: keyof FieldsSettings,
	type: "start" | "end",
	fieldName: string,
	plugin: ObsidianHardcover
): void {
	const fieldSettings = plugin.settings.fieldsSettings[
		fieldKey
	] as ActivityDateFieldConfig;
	const propName = type === "start" ? "startPropertyName" : "endPropertyName";
	const defaultValue = type === "start" ? `${fieldKey}Start` : `${fieldKey}End`;

	new Setting(containerEl)
		.setName(`${type.charAt(0).toUpperCase() + type.slice(1)} date property`)
		.setDesc(`Property name for ${fieldName.toLowerCase()} ${type} date`)
		.addText((text) => {
			text
				.setPlaceholder(defaultValue)
				.setValue(fieldSettings[propName])
				.onChange(async (value) => {
					(plugin.settings.fieldsSettings[fieldKey] as ActivityDateFieldConfig)[
						propName
					] = value || defaultValue;
					await plugin.saveSettings();
				});
		});
}
