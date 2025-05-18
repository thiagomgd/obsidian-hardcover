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

export function markSettingAsRequired(setting: Setting): Setting {
	const asterisk = document.createElement("span");
	asterisk.textContent = " *";
	asterisk.style.color = "var(--text-error)";
	setting.nameEl.appendChild(asterisk);

	return setting;
}
