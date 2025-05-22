import { Setting } from "obsidian";
import { HARDCOVER_STATUS_MAP } from "src/config/statusMapping";
import ObsidianHardcover from "src/main";

export function renderStatusMappingSettings(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover
): void {
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
					.setValue(plugin.settings.statusMapping[id] || "")
					.onChange(async (value) => {
						plugin.settings.statusMapping[id] = value || statusLabels[index];
						await plugin.saveSettings();
					})
			);
	});
}
