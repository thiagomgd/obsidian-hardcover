import { Notice } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import ObsidianHardcover from "src/main";

interface GetBooksParams {
	userId: number;
	totalBooks: number;
	updatedAfter?: string;
	debugMode?: boolean;
}

export class SyncService {
	private plugin: ObsidianHardcover;
	private hardcoverAPI: HardcoverAPI;

	constructor(plugin: ObsidianHardcover) {
		this.plugin = plugin;
		this.hardcoverAPI = plugin.hardcoverAPI;
	}

	async getBooks({
		userId,
		totalBooks,
		updatedAfter,
		debugMode = false,
	}: GetBooksParams) {
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
				userId,
				totalBooks,
				updatedAfter,
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

			notice.hide();

			if (debugMode) {
				new Notice(
					`DEBUG: Hardcover library sync complete with ${totalBooks} books!`
				);
			} else {
				new Notice("Hardcover library sync complete!");
			}
		} catch (error) {
			notice.hide();
			console.error("Error syncing library:", error);
			new Notice("Error syncing Hardcover library. Check console for details.");
		}
	}

	async updateTimestamp() {
		// update timestamp after successful sync
		this.plugin.settings.lastSyncTimestamp = new Date().toISOString();
		await this.plugin.saveSettings();
	}

	async startSync(options: { debugLimit?: number } = {}) {
		const storedUserId = this.plugin.settings.userId;
		const storedBooksCount = this.plugin.settings.booksCount;
		const lastSyncTimestamp = this.plugin.settings.lastSyncTimestamp;
		const isDebugMode = options.debugLimit !== undefined;

		if (storedUserId && storedBooksCount) {
			// if in debug mode, use the limited count, otherwise use the full count
			const booksToProcess = isDebugMode
				? Math.min(options.debugLimit!, storedBooksCount)
				: storedBooksCount;

			if (isDebugMode) {
				console.log(
					`Debug sync: Processing ${booksToProcess}/${storedBooksCount} books`
				);
				new Notice(`DEBUG MODE: Sync limited to ${booksToProcess} books`);
			}

			await this.getBooks({
				userId: storedUserId,
				totalBooks: booksToProcess,
				updatedAfter: lastSyncTimestamp,
			});

			this.updateTimestamp();
		} else {
			try {
				const user = await this.hardcoverAPI.fetchUserId();

				if (user?.id) {
					this.plugin.settings.userId = user.id;

					const booksCount = await this.hardcoverAPI.fetchBooksCount(user.id);

					// if in debug mode, limit the books to process
					const booksToProcess = isDebugMode
						? Math.min(options.debugLimit!, booksCount)
						: booksCount;

					// store the actual books count regardless of debug mode
					this.plugin.settings.userId = user.id;
					this.plugin.settings.booksCount = booksCount;
					await this.plugin.saveSettings();

					if (isDebugMode) {
						console.log(
							`Debug sync: Processing ${booksToProcess}/${booksCount} books`
						);
						new Notice(`DEBUG MODE: Sync limited to ${booksToProcess} books`);
					}

					if (booksToProcess > 0) {
						await this.getBooks({
							userId: user.id,
							totalBooks: booksToProcess,
							updatedAfter: lastSyncTimestamp,
						});
						this.updateTimestamp();
					}
				} else {
					console.error("No user ID found in response");
					new Notice("Error: No user ID found");
				}
			} catch (error) {
				console.error("Error fetching user ID: ", error);
				new Notice("Error fetching user ID. Check console for details.");
			}
		}
	}
}
