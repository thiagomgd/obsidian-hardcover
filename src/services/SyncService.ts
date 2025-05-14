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

	async startSync(options: { debugLimit?: number } = {}) {
		const isDebugMode = options.debugLimit !== undefined;

		try {
			await this.ensureUserData();

			// calculate how many books to process
			const booksToProcess = this.getBooksToProcess(
				isDebugMode,
				options.debugLimit
			);

			// show debug notice if in debug mode
			if (isDebugMode) {
				console.log(
					`Debug sync: Processing ${booksToProcess}/${this.plugin.settings.booksCount} books`
				);
				new Notice(`DEBUG MODE: Sync limited to ${booksToProcess} books`);
			}

			if (booksToProcess > 0) {
				await this.syncBooks(booksToProcess, isDebugMode);
			}
		} catch (error) {
			console.error("Sync failed:", error);
			new Notice("Sync failed. Check console for details.");
		}
	}

	private async ensureUserData() {
		if (this.plugin.settings.userId && this.plugin.settings.booksCount) {
			return;
		}

		// fetch user ID
		const user = await this.hardcoverAPI.fetchUserId();
		if (!user?.id) {
			throw new Error("No user ID found in response");
		}

		// fetch book count
		const booksCount = await this.hardcoverAPI.fetchBooksCount(user.id);

		// save to settings
		this.plugin.settings.userId = user.id;
		this.plugin.settings.booksCount = booksCount;
		await this.plugin.saveSettings();
	}

	private getBooksToProcess(isDebugMode: boolean, debugLimit?: number): number {
		const totalBooks = this.plugin.settings.booksCount || 0;
		return isDebugMode && debugLimit
			? Math.min(debugLimit, totalBooks)
			: totalBooks;
	}

	private async syncBooks(totalBooks: number, debugMode: boolean = false) {
		const { userId, lastSyncTimestamp } = this.plugin.settings;
		const { metadataService, noteService } = this.plugin;

		const notice = new Notice("Syncing Hardcover library...", 0);

		try {
			const totalTasks = totalBooks * 2; // each book counts twice: one for fetch, one for the note creation
			let completedTasks = 0;

			const updateProgress = (message: string) => {
				const percentage = Math.round((completedTasks / totalTasks) * 100);
				notice.setMessage(`${message} (${percentage}%)`);
			};

			// Task 1: fetch data from API
			updateProgress("Fetching books");

			const books = await this.hardcoverAPI.fetchEntireLibrary({
				userId: userId!,
				totalBooks,
				updatedAfter: lastSyncTimestamp,
				onProgress(current, total) {
					completedTasks = current;
					updateProgress("Fetching books");
				},
			});

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

			// update timestamp after successful sync
			this.plugin.settings.lastSyncTimestamp = new Date().toISOString();
			await this.plugin.saveSettings();

			notice.hide();

			const message = debugMode
				? `DEBUG: Hardcover library sync complete with ${books.length} books!`
				: `Hardcover library sync complete with ${books.length} books!`;

			new Notice(message);
		} catch (error) {
			notice.hide();
			console.error("Error syncing library:", error);
			new Notice("Error syncing Hardcover library. Check console for details.");
			throw error;
		}
	}
}
