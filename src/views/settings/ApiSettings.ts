import { Setting } from "obsidian";
import ObsidianHardcover from "src/main";

export function renderApiTokenSetting(
	containerEl: HTMLElement,
	plugin: ObsidianHardcover,
	onSettingsChanged: () => void
): void {
	new Setting(containerEl)
		.setName("Hardcover API key")
		.setDesc("Get your API key from https://hardcover.app/account/api")
		.addExtraButton((button) => {
			button
				.setIcon("refresh-cw")
				.setTooltip("Clear API key")
				.onClick(async () => {
					plugin.settings.apiKey = "";
					await plugin.saveSettings();
					onSettingsChanged();
				});
		})
		.addText((text) =>
			text
				.setPlaceholder("Enter your API key")
				.setValue(plugin.settings.apiKey)
				.onChange(async (value) => {
					plugin.settings.apiKey = value;
					await plugin.saveSettings();
				})
		);
}
