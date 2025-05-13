import { HardcoverAPI } from "src/api/HardcoverAPI";
import ObsidianHardcover from "src/main";

export class SyncService {
	private plugin: ObsidianHardcover;
	private hardcoverAPI: HardcoverAPI;

	constructor(plugin: ObsidianHardcover) {
		this.plugin = plugin;
		this.hardcoverAPI = plugin.hardcoverAPI;
	}

	async getBooks(userId: number, totalBooks: number) {
		try {
			console.log("Starting book sync...");

			// DEBUG method
			const books = await this.hardcoverAPI.fetchLibraryPage({
				userId,
				offset: 0,
				limit: 1,
			});

			// const books = await this.hardcoverAPI.fetchEntireLibrary({
			// 	userId,
			// 	totalBooks,
			// 	onProgress(current, total) {
			// 		console.log(`Progress: ${current}/${total} books`);
			// 	},
			// });

			console.log(`Sync complete. Fetched ${books.length} books`);
			console.log({ books });

			// TODO: Process books here
		} catch (error) {
			console.error("Error fetching library: ", error);
		}
	}

	async startSync() {
		const storedUserId = this.plugin.settings.userId;
		const storedBooksCount = this.plugin.settings.booksCount;

		if (storedUserId && storedBooksCount) {
			this.getBooks(storedUserId, storedBooksCount);
		} else {
			try {
				const user = await this.hardcoverAPI.fetchUserId();

				if (user?.id) {
					this.plugin.settings.userId = user.id;

					const booksCount = await this.hardcoverAPI.fetchBooksCount(user.id);

					this.plugin.settings.userId = user.id;
					this.plugin.settings.booksCount = booksCount;
					await this.plugin.saveSettings();

					if (booksCount) {
						this.getBooks(user.id, booksCount);
					}
				} else {
					console.error("No user ID found in response");
				}
			} catch (error) {
				console.error("Error fetching user ID: ", error);
			}
		}
	}
}
