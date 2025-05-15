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
		const targetFolder = this.plugin.settings.targetFolder;

		if (this.plugin.fileUtils.isRootOrEmpty(targetFolder)) {
			new Notice(
				"Please specify a subfolder for your Hardcover books. Using the vault root is not supported."
			);
			return;
		}

		const isDebugMode = options.debugLimit !== undefined;

		try {
			// get user ID if not there
			const userId = await this.ensureUserId();

			// always get the latest book count before syncing
			const currentBooksCount = await this.hardcoverAPI.fetchBooksCount(userId);

			// update the stored books count
			this.plugin.settings.booksCount = currentBooksCount;
			await this.plugin.saveSettings();

			const booksToProcess =
				isDebugMode && options.debugLimit
					? Math.min(options.debugLimit, currentBooksCount)
					: currentBooksCount;

			// show debug notice if in debug mode
			if (isDebugMode) {
				console.log(
					`Debug sync: Processing ${booksToProcess}/${currentBooksCount} books`
				);
				new Notice(`DEBUG MODE: Sync limited to ${booksToProcess} books`);
			}

			if (booksToProcess > 0) {
				await this.syncBooks(userId, booksToProcess, isDebugMode);
			} else {
				new Notice("No books found in your Hardcover library.");
			}
		} catch (error) {
			console.error("Sync failed:", error);
			new Notice("Sync failed. Check console for details.");
		}
	}

	private async ensureUserId(): Promise<number> {
		if (this.plugin.settings.userId) {
			return this.plugin.settings.userId;
		}

		const user = await this.hardcoverAPI.fetchUserId();
		if (!user?.id) {
			throw new Error("No user ID found in response");
		}

		// save to settings
		this.plugin.settings.userId = user.id;
		await this.plugin.saveSettings();

		return user.id;
	}

	private async syncBooks(
		userId: number,
		totalBooks: number,
		debugMode: boolean = false
	) {
		const { lastSyncTimestamp } = this.plugin.settings;
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
				updatedAfter: lastSyncTimestamp,
				onProgress(current) {
					completedTasks = current;
					updateProgress("Fetching books");
				},
			});

			// Fetch complete
			completedTasks = totalBooks;

			let createdNotesCount = 0;
			let updatedNotesCount = 0;

			// Task 2: create notes
			for (let i = 0; i < books.length; i++) {
				updateProgress("Creating notes");
				const book = books[i];
				const metadata = metadataService.buildMetadata(book);

				// check if note already exists by checking hardcover book Id
				const existingNote = await noteService.findNoteByHardcoverId(
					book.book_id
				);

				if (existingNote) {
					// update existing note
					await noteService.updateNote(metadata, existingNote);
					updatedNotesCount++;
				} else {
					// create new note
					await noteService.createNote(metadata);
					createdNotesCount++;
				}

				completedTasks = totalBooks + (i + 1);
			}

			// update timestamp after successful sync
			this.plugin.settings.lastSyncTimestamp = new Date().toISOString();
			await this.plugin.saveSettings();

			notice.hide();

			const message = debugMode
				? `DEBUG: Sync complete: ${createdNotesCount} created, ${updatedNotesCount} updated!`
				: `Sync complete: ${createdNotesCount} created, ${updatedNotesCount} updated!`;

			new Notice(message);
		} catch (error) {
			notice.hide();
			console.error("Error syncing library:", error);
			new Notice("Error syncing Hardcover library. Check console for details.");
			throw error;
		}
	}
}
