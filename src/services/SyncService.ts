import { Notice } from "obsidian";
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
		const { metadataService, noteService } = this.plugin;

		const notice = new Notice("Syncing Hardcover library...", 0);

		try {
			const totalTasks = totalBooks * 2; // each book counts twice: one for fetch, one for the note creation
			let completedTasks = 0;

			const updateProgress = (message: string) => {
				const percentage = Math.round((completedTasks / totalTasks) * 100);
				notice.setMessage(`${message} (${percentage})%`);
			};

			// Task 1: fetch data from API
			updateProgress("Fetching books");
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
			// 		completedTasks = current;
			// 		updateProgress("Fetching books");
			// 	},
			// });

			// Fetch complete
			completedTasks = totalBooks;

			// Task 2: create notes
			for (let i = 0; i < books.length; i++) {
				updateProgress("Creating notes");
				const book = books[i];
				const metadata = metadataService.buildMetadata(book);
				await noteService.createNote(metadata);
				completedTasks = totalBooks + (i + 1);
			}

			notice.hide();
			new Notice("Hardcover library sync complete!");

			// console.log({ books });
		} catch (error) {
			notice.hide();
			console.error("Error syncing library:", error);
			new Notice("Error syncing Hardcover library. Check console for details.");
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
