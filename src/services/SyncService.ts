import { HardcoverAPI } from "src/api/HardcoverAPI";
import ObsidianHardcover from "src/main";

export class SyncService {
	private plugin: ObsidianHardcover;
	private hardcoverAPI: HardcoverAPI;

	constructor(plugin: ObsidianHardcover) {
		this.plugin = plugin;
		this.hardcoverAPI = plugin.hardcoverAPI;
	}

	async startSync() {
		if (this.plugin.settings.userId) {
		} else {
			try {
				const user = await this.hardcoverAPI.fetchUserId();

				if (user?.id) {
					this.plugin.settings.userId = String(user.id);
					await this.plugin.saveSettings();
				} else {
					console.error("No user ID found in response");
				}
			} catch (error) {
				console.error("Error fetching user ID:", error);
			}
		}
	}
}
