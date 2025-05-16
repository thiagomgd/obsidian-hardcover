import { Setting } from "obsidian";
import ObsidianHardcover from "src/main";

export function createSetting(
	containerEl: HTMLElement,
	name: string,
	description: string,
	settingClassName?: string
): Setting {
	const setting = new Setting(containerEl).setName(name).setDesc(description);

	if (settingClassName) {
		setting.setClass(settingClassName);
	}

	return setting;
}
