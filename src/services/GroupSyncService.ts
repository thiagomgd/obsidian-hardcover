import { Notice } from "obsidian";
import { HardcoverAPI } from "src/api/HardcoverAPI";
import ObsidianHardcover from "src/main";
import { AuthorMetadata, BookMetadata, HardcoverUserBook, SeriesMetadata } from "src/types";

/*
TODDO: 
- fetch series information
- create author notes
- create series notes
- update author notes
- update series notes
*/

export class GroupSyncService {
	private plugin: ObsidianHardcover;
	private hardcoverAPI: HardcoverAPI;

	constructor(plugin: ObsidianHardcover) {
		this.plugin = plugin;
		this.hardcoverAPI = plugin.hardcoverAPI;
	}

	private isSeries(book: BookMetadata): boolean {
		return !!book.groupInformationSeries?.seriesName;
	}

	private groupBooks(books: BookMetadata[]): 
	{ series: Map<number,{name:string, books: BookMetadata[]}>; 
		authors: Map<number,{name:string, books: BookMetadata[]}> } 
	{
		const seriesMap = new Map<number,{name:string, books: BookMetadata[]}>();
		const authorMap = new Map<number,{name:string, books: BookMetadata[]}>();

		for (const book of books) {
			// skip to-read books
			if (book.status_id === 1) { 
				continue;
			}

			if (this.isSeries(book)) {
				const seriesName = book.groupInformationSeries?.seriesName || "Unknown Series";
				const seriesId = book.groupInformationSeries?.seriesId || -1;
				if (!seriesMap.has(seriesId)) {
					seriesMap.set(seriesId, {name: seriesName, books: []});
				}
				seriesMap.get(seriesId)?.books?.push(book);
			} else {
				const authorId = book.groupInformationAuthor?.authorId || -1;
				const authorName = book.groupInformationAuthor?.authorName || "Unknown Author";
				if (!authorMap.has(authorId)) {
					authorMap.set(authorId, {name: authorName, books:[]});
				}
				authorMap.get(authorId)?.books?.push(book);
			}
		}	
		
		// sort series
		seriesMap.forEach((series, _seriesId) => {
			series.books.sort((a, b) => {
				const aSeriesIndex = a.groupInformationSeries?.seriesPosition || 0;
				const bSeriesIndex = b.groupInformationSeries?.seriesPosition || 0;
				return aSeriesIndex - bSeriesIndex;
			});
		});

		// sort author books
		authorMap.forEach((author, _authorId) => {
			author.books.sort((a, b) => {
				return (a.groupInformationAuthor?.releaseYear || 0) - (b.groupInformationAuthor?.releaseYear || 0);
			});
		});


		return {
			series: seriesMap,
			authors: authorMap,
		};
	}

	private validateTimestamp(timestamp: string): boolean {
		if (!timestamp) return true; // empty timestamp is valid, for full sync

		// ISO 8601 format regex
		const isoDateRegex =
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(([+-]\d{2}:\d{2})|Z)?$/;
		return isoDateRegex.test(timestamp);
	}

	async startSync(options: { debugLimit?: number } = {}) {
		const targetFolder = this.plugin.settings.targetFolder;
		const { lastSyncTimestamp } = this.plugin.settings;

		if (this.plugin.fileUtils.isRootOrEmpty(targetFolder)) {
			new Notice(
				"Please specify a subfolder for your Hardcover books. Using the vault root is not supported."
			);
			return;
		}

		if (lastSyncTimestamp && !this.validateTimestamp(lastSyncTimestamp)) {
			new Notice(
				"Invalid timestamp format. Please use ISO 8601 format (YYYY-MM-DD'T'HH:mm:ss.SSSZ) or leave empty."
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

			let errorMessage = "Sync failed.";

			if (error.message.includes("Authentication failed")) {
				errorMessage = error.message;
			} else if (
				error.message.includes("Unable to connect") ||
				error.message.includes("timed out") ||
				error.message.includes("ENOTFOUND") ||
				error.message.includes("ETIMEDOUT")
			) {
				errorMessage =
					"Could not connect to Hardcover API. Please check your internet connection and try again.";
			} else if (error.message.includes("Rate limit")) {
				errorMessage =
					"Rate limit reached. Please wait a few minutes and try again.";
			} else {
				errorMessage =
					"Sync failed. Check the developer console for more details (Ctrl+Shift+I).";
			}

			new Notice(errorMessage, 10000); // show for 10 seconds
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
			let failedBooksCount = 0;
			let failedBooks: Array<{ id: number; title: string; error: string }> = [];

			const booksMetadata = books.map((book) =>
				metadataService.buildMetadata(book, true)
			);
			const groupedBooks = this.groupBooks(booksMetadata);

			// Task 2: create notes

			updateProgress("Creating notes for series");
			for (const [seriesId, seriesObj] of groupedBooks.series.entries()) {
				try {
					const metadata = metadataService.buildGroupedMetadata('series', seriesId, seriesObj.name, seriesObj.books);

					// check if note already exists by checking author name
					const existingNote = await noteService.findNoteByHardcoverSeriesId(
						seriesId
					);

					if (existingNote) {
						// update existing note
						await noteService.updateGroupedNote('series', seriesObj.books, existingNote);
						updatedNotesCount++;
					} else {
						// create new note
						await noteService.createSeriesNote(metadata as SeriesMetadata);
						createdNotesCount++;
					}
				} catch (error) {
					console.error("Error processing series:", error);

					failedBooks.push({
						id: seriesId,
						title: seriesObj.name,
						error: error.message,
					});

					failedBooksCount++;
				}

				completedTasks += 1; // increment for each series processed
				updateProgress("Creating notes for series");
			}

			updateProgress("Creating notes for authors");
			for (const [authorId, authorObj] of groupedBooks.authors.entries()) {
				try {
					const metadata = metadataService.buildGroupedMetadata('author', authorId, authorObj.name, authorObj.books);

					// check if note already exists by checking author name
					const existingNote = await noteService.findNoteByHardcoverAuthorId(
						authorId
					);

					if (existingNote) {
						// update existing note
						await noteService.updateGroupedNote('author', authorObj.books, existingNote);
						updatedNotesCount++;
					} else {
						// create new note
						await noteService.createAuthorNote(metadata as AuthorMetadata);
						createdNotesCount++;
					}
				} catch (error) {
					console.error("Error processing author:", error);

					failedBooks.push({
						id: authorId,
						title: authorObj.name,
						error: error.message,
					});

					failedBooksCount++;
				}

				completedTasks += 1; // increment for each author processed
				updateProgress("Creating notes for authors");
			}

			// only update the timestamp if ALL books were successfully processed
			if (failedBooksCount === 0) {
				this.plugin.settings.lastSyncTimestamp = new Date().toISOString();
				await this.plugin.saveSettings();
			}

			notice.hide();

			let message = debugMode
				? `DEBUG: Sync complete: ${createdNotesCount} created, ${updatedNotesCount} updated!`
				: `Sync complete: ${createdNotesCount} created, ${updatedNotesCount} updated!`;

			if (failedBooksCount > 0) {
				message += ` (${failedBooksCount} books failed to process)`;

				console.warn(
					`${failedBooksCount} books failed to process:`,
					failedBooks
				);

				console.log("Last sync timestamp not updated due to book failures");
			}

			new Notice(message);
		} catch (error) {
			notice.hide();
			console.error("Error syncing library:", error);
			new Notice("Error syncing Hardcover library. Check console for details.");
			throw error;
		}
	}
}
