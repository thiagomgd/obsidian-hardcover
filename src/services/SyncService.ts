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
			console.log("user id exists");
		} else {
			console.log(" user id does not exist");
			const user = await this.hardcoverAPI.fetchUserId();
			const userId = user[0]?.id;
			// TODO: gracefully handle missing user id
			if (userId) {
				this.plugin.settings.userId = userId;
				await this.plugin.saveSettings();
			}
		}
	}
}
