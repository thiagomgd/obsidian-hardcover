import { FileManager, TFile, Vault } from "obsidian";
import { AUTHOR_GROUPED_NOTE_BOOK_TEMPLATE, AUTHOR_GROUPED_NOTE_TEMPLATE, CONTENT_DELIMITER, GROUPED_CONTENT_START, GROUPED_GENRES_END, GROUPED_GENRES_START, PERSONAL_CONTENT_START, REVIEW_TEMPLATE, SERIES_GROUPED_GENRES_TEMPLATE, SERIES_GROUPED_NOTE_BOOK_TEMPLATE, SERIES_GROUPED_NOTE_TEMPLATE } from "src/config/constants";
import { FIELD_DEFINITIONS } from "src/config/fieldDefinitions";
import { HARDCOVER_STATUS_MAP_REVERSE } from "src/config/statusMapping";

import ObsidianHardcover from "src/main";
import { ActivityDateFieldConfig, AuthorMetadata, BookMetadata, SeriesMetadata } from "src/types";
import { FileUtils } from "src/utils/FileUtils";
import { toKebabCase, toMarkdownBlockquote } from "src/utils/formattingUtils";

export class NoteService {
	constructor(
		private vault: Vault,
		private fileManager: FileManager,
		private fileUtils: FileUtils,
		private plugin: ObsidianHardcover
	) {
		this.plugin = plugin;
	}

	async createNote(bookMetadata: BookMetadata): Promise<TFile | null> {
		try {
			const filename = this.fileUtils.processFilenameTemplate(
				this.plugin.settings.filenameTemplate,
				bookMetadata
			);

			const targetFolder = this.fileUtils.normalizePath(
				this.plugin.settings.targetFolder
			);
			await this.ensureFolderExists(targetFolder);
			const fullPath = targetFolder ? `${targetFolder}/${filename}` : filename;

			// create frontmatter and full note content with delimiter
			const frontmatter = this.createFrontmatter(bookMetadata);
			const noteContent = this.createNoteContent(frontmatter, bookMetadata);

			let file;
			if (await this.vault.adapter.exists(fullPath)) {
				// if file exists, write to it and then get the file reference
				await this.vault.adapter.write(fullPath, noteContent);
				file = this.vault.getAbstractFileByPath(fullPath) as TFile;
				console.log(`Updated note: ${fullPath}`);
			} else {
				// create new file
				file = await this.vault.create(fullPath, noteContent);
				console.log(`Created note: ${fullPath}`);
			}

			return file;
		} catch (error) {
			console.error("Error creating note:", error);
			return null;
		}
	}

	async updateNote(
		bookMetadata: BookMetadata,
		existingFile: TFile
	): Promise<TFile | null> {
		try {
			const originalPath = existingFile.path;
			const existingContent = await this.vault.read(existingFile);

			const frontmatter = this.createFrontmatter(bookMetadata);
			const newContent = this.createNoteContent(frontmatter, bookMetadata);
			// check if the delimiter exists in the current content
			const delimiterIndex = existingContent.indexOf(CONTENT_DELIMITER);

			let updatedContent: string;
			if (delimiterIndex !== -1) {
				// preserve original content after it
				const userContent = existingContent.substring(
					delimiterIndex + CONTENT_DELIMITER.length
				);

				updatedContent = newContent.replace(
					`${CONTENT_DELIMITER}\n\n`,
					`${CONTENT_DELIMITER}${userContent}`
				);
			} else {
				updatedContent = newContent;
			}

			// generate the new filename based on current template
			const newFilename = this.fileUtils.processFilenameTemplate(
				this.plugin.settings.filenameTemplate,
				bookMetadata
			);

			const targetFolder = this.fileUtils.normalizePath(
				this.plugin.settings.targetFolder
			);
			const newPath = targetFolder
				? `${targetFolder}/${newFilename}`
				: newFilename;

			// check if the file needs to be renamed
			if (originalPath !== newPath) {
				await this.vault.modify(existingFile, updatedContent);
				await this.vault.rename(existingFile, newPath);

				console.log(`Updated and renamed note: ${originalPath} -> ${newPath}`);

				// get the new file reference after renaming
				return this.vault.getAbstractFileByPath(newPath) as TFile;
			} else {
				await this.vault.modify(existingFile, updatedContent);
				console.log(`Updated note: ${originalPath}`);

				return existingFile;
			}
		} catch (error) {
			console.error("Error updating note:", error);
			return null;
		}
	}

	private createNoteContent(frontmatter: string, bookMetadata: any): string {
		let content = this.getFrontmatterString(frontmatter);

		// add title
		const title = this.getBookTitle(bookMetadata);
		const escapedTitle = this.fileUtils.escapeMarkdownCharacters(title);
		content += `# ${escapedTitle}\n\n`;

		// add book cover if enabled
		const hasCover =
			this.plugin.settings.fieldsSettings.cover.enabled &&
			bookMetadata[this.plugin.settings.fieldsSettings.cover.propertyName];

		if (hasCover) {
			const coverProperty =
				this.plugin.settings.fieldsSettings.cover.propertyName;
			content += `![${escapedTitle} Cover|300](${bookMetadata[coverProperty]})\n\n`;
		}

		// add description if available
		const hasDescription =
			this.plugin.settings.fieldsSettings.description.enabled &&
			bookMetadata[
				this.plugin.settings.fieldsSettings.description.propertyName
			];

		if (hasDescription) {
			const descProperty =
				this.plugin.settings.fieldsSettings.description.propertyName;
			// add extra spacing if there is a cover above
			const spacing = hasCover ? "\n" : "";
			content += `${spacing}${bookMetadata[descProperty]}\n\n`;
		}

		if (
			this.plugin.settings.fieldsSettings.review.enabled &&
			bookMetadata.bodyContent.review
		) {
			const formattedReview = this.formatReviewText(
				bookMetadata.bodyContent.review
			);
			content += `## My Review\n\n${formattedReview}\n\n`;
		}

		// add obsidian-hardcover plugin delimiter
		content += `\n${CONTENT_DELIMITER}\n\n`;

		return content;
	}

	private getBookTitle(bookMetadata: any) {
		const titleProperty =
			this.plugin.settings.fieldsSettings.title.propertyName;

		return bookMetadata[titleProperty] || "Untitled";
	}

	private async ensureFolderExists(folderPath: string): Promise<void> {
		if (!folderPath) return;

		const exists = await this.vault.adapter.exists(folderPath);
		if (!exists) {
			console.log(`Creating folder: ${folderPath}`);
			await this.vault.createFolder(folderPath);
		}
	}

	private getFrontmatterString(frontmatter: string) {
		return `---\n${frontmatter}\n---\n\n`;
	}

	private createFrontmatter(metadata: Record<string, any>): string {
		// exclude bodyContent from frontmatter
		const { bodyContent, ...frontmatterData } = metadata;

		const frontmatterEntries: string[] = [];

		// first add hardcoverBookId as the first property
		if (frontmatterData.hardcoverBookId !== undefined) {
			frontmatterEntries.push(
				`hardcoverBookId: ${frontmatterData.hardcoverBookId}`
			);
		}

		// for grouped notes add hardcoverAuthorId as the first property
		if (frontmatterData.hardcoverAuthorId !== undefined) {
			frontmatterEntries.push(
				`hardcoverAuthorId: ${frontmatterData.hardcoverAuthorId}`
			);
		}

		// for grouped notes add hardcoverSeriesId as the first property
		if (frontmatterData.hardcoverSeriesId !== undefined) {
			frontmatterEntries.push(
				`hardcoverSeriesId: ${frontmatterData.hardcoverSeriesId}`
			);
		}

		// add all other properties in the order defined in FIELD_DEFINITIONS
		const allFieldPropertyNames = FIELD_DEFINITIONS.flatMap((field) => {
			const fieldSettings = this.plugin.settings.fieldsSettings[field.key];

			const propertyNames = [fieldSettings.propertyName];

			// add start/end property names for activity date fields
			if (field.isActivityDateField) {
				const activityField = fieldSettings as ActivityDateFieldConfig;
				propertyNames.push(
					activityField.startPropertyName,
					activityField.endPropertyName
				);
			}

			return propertyNames;
		});

		// add properties in the defined order
		for (const propName of allFieldPropertyNames) {
			if (!frontmatterData.hasOwnProperty(propName)) continue;

			// skip hardcoverBookId as we already added it
			if (propName === "hardcoverBookId") continue;

			const value = frontmatterData[propName];

			// skip undefined/null values
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				frontmatterEntries.push(`${propName}: ${JSON.stringify(value)}`);
			} else if (typeof value === "string") {
				if (
					propName ===
					this.plugin.settings.fieldsSettings.description.propertyName
				) {
					// remove all \n sequences and replace with spaces to avoid frontmatter issues
					const cleanValue = value.replace(/\\n/g, " ").trim();
					// remove any multiple spaces that might result
					const finalValue = cleanValue.replace(/\s+/g, " ");
					frontmatterEntries.push(
						`${propName}: "${finalValue.replace(/"/g, '\\"')}"`
					);
				} else {
					// for other string fields, just escape quotes
					frontmatterEntries.push(
						`${propName}: "${value.replace(/"/g, '\\"')}"`
					);
				}
			} else {
				frontmatterEntries.push(`${propName}: ${value}`);
			}
		}

		return frontmatterEntries.join("\n");
	}



	private formatReviewText(reviewText: string): string {
		if (!reviewText) return "";

		// console.log("Original review text:", reviewText);
		// check if the review already contains HTML
		if (reviewText.includes("<p>") || reviewText.includes("<br>")) {
			// convert HTML to markdown-friendly format
			let formatted = reviewText
				.replace(/<p>/g, "")
				.replace(/<\/p>/g, "\n\n")
				.replace(/<br\s*\/?>/g, "\n")
				.replace(/&quot;/g, '"')
				.replace(/&amp;/g, "&")
				.replace(/&lt;/g, "<")
				.replace(/&gt;/g, ">");

			return formatted.trim();
		} else {
			// for raw text apply basic formatting
			return reviewText.replace(/\\"/g, '"').trim();
		}
	}

	async findNoteByHardcoverId(hardcoverBookId: number): Promise<TFile | null> {
		try {
			const folderPath = this.plugin.settings.targetFolder;

			const folderExists = await this.vault.adapter.exists(folderPath);
			if (!folderExists) {
				console.log(`Specified target folder doesn't exist: ${folderPath}`);
				return null;
			}

			// get all markdown files in the folder
			const folder = this.vault.getFolderByPath(folderPath);
			if (!folder) {
				console.log(`Couldn't get folder object for: ${folderPath}`);
				return null;
			}

			// search through files in the folder
			for (const file of folder.children) {
				// only check markdown files
				if (file instanceof TFile && file.extension === "md") {
					const content = await this.vault.read(file);

					// check if it has frontmatter
					const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
					if (frontmatterMatch) {
						const frontmatter = frontmatterMatch[1];

						// check if hardcoverBookId matches
						const idMatch = frontmatter.match(/hardcoverBookId:\s*(\d+)/);
						if (idMatch && parseInt(idMatch[1]) === hardcoverBookId) {
							return file;
						}
					}
				}
			}

			return null;
		} catch (error) {
			console.error(
				`Error finding note by Hardcover Book ID ${hardcoverBookId}:`,
				error
			);
			return null;
		}
	}

	// FUNCTIONALITY FOR GROUPED NOTES
	async createAuthorNote(authorMetadata: AuthorMetadata): Promise<TFile | null> {
		try {
			const filename = this.fileUtils.processFilenameTemplate(
				this.plugin.settings.groupAuthorFilenameTemplate,
				authorMetadata
			);

			const targetFolder = this.fileUtils.normalizePath(
				this.plugin.settings.groupAuthorTargetFolder
			);
			await this.ensureFolderExists(targetFolder);
			const fullPath = targetFolder ? `${targetFolder}/${filename}` : filename;

			// create frontmatter and full note content with delimiter
			const frontmatter = this.createGroupedFrontmatter(authorMetadata);

			const noteContent = this.createGroupedNoteContent("author", frontmatter, authorMetadata);

			let file;
			if (await this.vault.adapter.exists(fullPath)) {
				// if file exists, write to it and then get the file reference
				await this.vault.adapter.write(fullPath, noteContent);
				file = this.vault.getAbstractFileByPath(fullPath) as TFile;
				console.log(`Updated note: ${fullPath}`);
			} else {
				// create new file
				file = await this.vault.create(fullPath, noteContent);
				console.log(`Created note: ${fullPath}`);
			}

			return file;
		} catch (error) {
			console.error("Error creating note:", error);
			return null;
		}
	}

	// TOOD: join the two functions into one (author/series)
	async createSeriesNote(seriesMetadata: SeriesMetadata): Promise<TFile | null> {
		try {
			const filename = this.fileUtils.processFilenameTemplate(
				this.plugin.settings.groupSeriesFilenameTemplate,
				seriesMetadata
			);

			const targetFolder = this.fileUtils.normalizePath(
				this.plugin.settings.groupSeriesTargetFolder
			);
			await this.ensureFolderExists(targetFolder);
			const fullPath = targetFolder ? `${targetFolder}/${filename}` : filename;

			// create frontmatter and full note content with delimiter
			const frontmatter = this.createGroupedFrontmatter(seriesMetadata);

			const noteContent = this.createGroupedNoteContent("series", frontmatter, seriesMetadata);

			let file;
			if (await this.vault.adapter.exists(fullPath)) {
				// if file exists, write to it and then get the file reference
				await this.vault.adapter.write(fullPath, noteContent);
				file = this.vault.getAbstractFileByPath(fullPath) as TFile;
				console.log(`Updated note: ${fullPath}`);
			} else {
				// create new file
				file = await this.vault.create(fullPath, noteContent);
				console.log(`Created note: ${fullPath}`);
			}

			return file;
		} catch (error) {
			console.error("Error creating note:", error);
			return null;
		}
	}

	async findNoteByHardcoverAuthorId(hardcoverAuthorId: number): Promise<TFile | null> {
		try {
			const folderPath = this.plugin.settings.groupAuthorTargetFolder;

			const folderExists = await this.vault.adapter.exists(folderPath);
			if (!folderExists) {
				console.log(`Specified target folder doesn't exist: ${folderPath}`);
				return null;
			}

			// get all markdown files in the folder
			const folder = this.vault.getFolderByPath(folderPath);
			if (!folder) {
				console.log(`Couldn't get folder object for: ${folderPath}`);
				return null;
			}

			// search through files in the folder
			for (const file of folder.children) {
				// only check markdown files
				if (file instanceof TFile && file.extension === "md") {
					const content = await this.vault.read(file);

					// check if it has frontmatter
					const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
					if (frontmatterMatch) {
						const frontmatter = frontmatterMatch[1];

						// check if hardcoverBookId matches
						const idMatch = frontmatter.match(/hardcoverAuthorId:\s*(\d+)/);
						if (idMatch && parseInt(idMatch[1]) === hardcoverAuthorId) {
							return file;
						}
					}
				}
			}

			return null;
		} catch (error) {
			console.error(
				`Error finding note by Hardcover Author ID ${hardcoverAuthorId}:`,
				error
			);
			return null;
		}
	}

	async findNoteByHardcoverSeriesId(hardcoverSeriesId: number): Promise<TFile | null> {
		// TODO: allow multiple folders, so user can separate books, light novels, manga, comics, etc...
		try {
			const folderPath = this.plugin.settings.groupSeriesTargetFolder;

			const folderExists = await this.vault.adapter.exists(folderPath);
			if (!folderExists) {
				console.log(`Specified target folder doesn't exist: ${folderPath}`);
				return null;
			}

			// get all markdown files in the folder
			const folder = this.vault.getFolderByPath(folderPath);
			if (!folder) {
				console.log(`Couldn't get folder object for: ${folderPath}`);
				return null;
			}

			// search through files in the folder
			for (const file of folder.children) {
				// only check markdown files
				if (file instanceof TFile && file.extension === "md") {
					const content = await this.vault.read(file);

					// check if it has frontmatter
					const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
					if (frontmatterMatch) {
						const frontmatter = frontmatterMatch[1];

						// check if hardcoverBookId matches
						const idMatch = frontmatter.match(/hardcoverSeriesId:\s*(\d+)/);
						if (idMatch && parseInt(idMatch[1]) === hardcoverSeriesId) {
							return file;
						}
					}
				}
			}

			return null;
		} catch (error) {
			console.error(
				`Error finding note by Hardcover Series ID ${hardcoverSeriesId}:`,
				error
			);
			return null;
		}
	}

	private formatGenres(genres?: string[]): string[] {
		if (!genres || genres.length === 0) return [];

		if (this.plugin.settings.genresAsTags) {
			return genres.map((genre) => {
				const kebabGenre = toKebabCase(genre);
				return this.plugin.settings.genresAsTags!.replace(/{{genre}}/g, kebabGenre);
			});
		}

		return genres;
	}

	private groupedNoteBookContent(type: "series" | "author", book: BookMetadata, existingContent = ""): string {
		const personalContent = existingContent?.split(PERSONAL_CONTENT_START)?.[1] || "";

		let bookContent = type === "series" ? SERIES_GROUPED_NOTE_BOOK_TEMPLATE : AUTHOR_GROUPED_NOTE_BOOK_TEMPLATE;

		bookContent = bookContent.replace(/{{bookId}}/g, book.hardcoverBookId.toString());

		const sortNumber = book.groupInformationSeries?.seriesPosition || book.groupInformationAuthor?.releaseYear || 0;
		bookContent = bookContent.replace(/{{sortNumber}}/g, sortNumber.toString());

		// add title
		const title = this.getBookTitle(book);
		bookContent = bookContent.replace(/{{title}}/g, title);
		// const escapedTitle = this.fileUtils.escapeMarkdownCharacters(title);
		// content += `# ${escapedTitle}\n\n`;

		// add book cover if enabled
		const hasCover =
			this.plugin.settings.fieldsSettings.cover.enabled &&
			book[this.plugin.settings.fieldsSettings.cover.propertyName];

		if (hasCover) {
			const coverProperty =
				this.plugin.settings.fieldsSettings.cover.propertyName;
			bookContent = bookContent.replace(/{{cover}}/g, book[coverProperty]);
		}

		// add description if available
		const hasDescription =
			this.plugin.settings.fieldsSettings.description.enabled &&
			book[
				this.plugin.settings.fieldsSettings.description.propertyName
			];

		let blockquoteDescription = ""
		if (hasDescription) {
			const descProperty =
				this.plugin.settings.fieldsSettings.description.propertyName;

			// TODO: configurable
			blockquoteDescription = toMarkdownBlockquote(book[descProperty]);
		}
		// add extra spacing if there is a cover above
		bookContent = bookContent.replace(/{{description}}/g, blockquoteDescription) // += `${spacing}${book[descProperty]}\n\n`;

		if (
			this.plugin.settings.fieldsSettings.review.enabled &&
			book.bodyContent.review
		) {
			const formattedReview = this.formatReviewText(
				book.bodyContent.review
			);
			let myReview = REVIEW_TEMPLATE;
			myReview = myReview.replace(/{{review}}/g, formattedReview);
			bookContent = bookContent.replace(/{{myReview}}/g, myReview);
		} else {
			bookContent = bookContent.replace(/{{myReview}}/g, "");
		}

		bookContent = bookContent.replace(/{{hardcoverUrl}}/g, book.url ? `[Hardcover.app](${book.url})` : "");
		bookContent = bookContent.replace(/{{genres}}/g, this.formatGenres(book.genres).join(", "));
		bookContent = bookContent.replace(/{{status}}/g, (book.status || []).join(", "));
		bookContent = bookContent.replace(/{{personalContent}}/g, personalContent.trim());

		return bookContent;
	}

	private createGroupedNoteContent(type: "series"|"author",frontmatter: string, metadata: AuthorMetadata | SeriesMetadata): string {
		const bookMetadata = metadata.bodyContent.books || [];
		let frontmatterStr = this.getFrontmatterString(frontmatter);
		let content = type === "series" ? SERIES_GROUPED_NOTE_TEMPLATE : AUTHOR_GROUPED_NOTE_TEMPLATE;
		
		content = frontmatterStr + content;

		if (type === "series") {
			if (metadata[this.plugin.settings.fieldsSettings["seriesGenres"].propertyName]) {
				const genres = this.formatGenres(metadata[this.plugin.settings.fieldsSettings["seriesGenres"].propertyName]);

				const groupedGenresContent = SERIES_GROUPED_GENRES_TEMPLATE.replace(/{{seriesGenres}}/g, genres.join(", "));

				content = content.replace("{{SERIES_GROUPED_GENRES_TEMPLATE}}", groupedGenresContent);
			}
		}

		const booksContents: string[] = [];

		for (const book of bookMetadata) {
			const bookContent = this.groupedNoteBookContent(type, book);
			booksContents.push(bookContent);
		}
		
		return content.replace(/{{booksContents}}/g, booksContents.join("\n\n"));

	}

	private createGroupedFrontmatter(metadata: Record<string, any>): string {
		// exclude bodyContent from frontmatter
		const { bodyContent, ...frontmatterData } = metadata;

		const frontmatterEntries: string[] = [];

		// first add hardcoverBookId as the first property
		if (frontmatterData.hardcoverBookId !== undefined) {
			frontmatterEntries.push(
				`hardcoverBookId: ${frontmatterData.hardcoverBookId}`
			);
		}

		// for grouped notes add hardcoverAuthorId as the first property
		if (frontmatterData.hardcoverAuthorId !== undefined) {
			frontmatterEntries.push(
				`hardcoverAuthorId: ${frontmatterData.hardcoverAuthorId}`
			);
		}

		// for grouped notes add hardcoverSeriesId as the first property
		if (frontmatterData.hardcoverSeriesId !== undefined) {
			frontmatterEntries.push(
				`hardcoverSeriesId: ${frontmatterData.hardcoverSeriesId}`
			);
		}

		// add all other properties in the order defined in FIELD_DEFINITIONS
		const allFieldPropertyNames = FIELD_DEFINITIONS.flatMap((field) => {
			const fieldSettings = this.plugin.settings.fieldsSettings[field.key];

			const propertyNames = [fieldSettings.propertyName];

			// add start/end property names for activity date fields
			if (field.isActivityDateField) {
				const activityField = fieldSettings as ActivityDateFieldConfig;
				propertyNames.push(
					activityField.startPropertyName,
					activityField.endPropertyName
				);
			}

			return propertyNames;
		});

		if (this.plugin.settings.dateCreatedPropertyName) {
			allFieldPropertyNames.push(
				this.plugin.settings.dateCreatedPropertyName
			);
			frontmatterData[this.plugin.settings.dateCreatedPropertyName] = new Date().toISOString();
		}

		if (this.plugin.settings.groupAddAliases && frontmatterData.aliases) {
			allFieldPropertyNames.push('aliases');
		}

		// add properties in the defined order
		for (const propName of allFieldPropertyNames) {
			if (!frontmatterData.hasOwnProperty(propName)) continue;

			// skip hardcoverBookId as we already added it
			if (propName === "hardcoverBookId") continue;

			const value = frontmatterData[propName];

			// skip undefined/null values
			if (value === undefined || value === null) continue;

			if (Array.isArray(value)) {
				frontmatterEntries.push(`${propName}: ${JSON.stringify(value)}`);
			} else if (typeof value === "string") {
				if (
					propName ===
					this.plugin.settings.fieldsSettings.description.propertyName
				) {
					// remove all \n sequences and replace with spaces to avoid frontmatter issues
					const cleanValue = value.replace(/\\n/g, " ").trim();
					// remove any multiple spaces that might result
					const finalValue = cleanValue.replace(/\s+/g, " ");
					frontmatterEntries.push(
						`${propName}: "${finalValue.replace(/"/g, '\\"')}"`
					);
				} else {
					// for other string fields, just escape quotes
					frontmatterEntries.push(
						`${propName}: "${value.replace(/"/g, '\\"')}"`
					);
				}
			} else {
				frontmatterEntries.push(`${propName}: ${value}`);
			}
		}

		return frontmatterEntries.join("\n");
	}

	async updateGroupedNote(
		type: "series"|"author",
		bookMetadata: BookMetadata[],
		existingFile: TFile
	): Promise<TFile | null> {
		try {
			// create arrays for each status if enabled in settings
			const { fieldsSettings, dateModifiedPropertyName, groupAddAliases } = this.plugin.settings;

			// const originalPath = existingFile.path;
			const existingContent = await this.vault.read(existingFile);
			
			const aliases: string[] = [];
			const seriesGenres: string[] = [];
			const booksToStatus: Record<string, number> = {};

			await this.fileManager.processFrontMatter(existingFile, (frontmatter) =>{
				for (const id of frontmatter[fieldsSettings.booksToRead.propertyName] || []) {
					booksToStatus[id] = 1;
				}
				for (const id of frontmatter[fieldsSettings.booksReading.propertyName] || []) {
					booksToStatus[id] = 2;
				}
				for (const id of frontmatter[fieldsSettings.booksRead.propertyName] || []) {
					booksToStatus[id] = 3;
				}
				for (const id of frontmatter[fieldsSettings.booksDNF.propertyName] || []) {
					booksToStatus[id] = 5;
				}
				aliases.push(...(frontmatter.aliases || []));
				if (type === "series" && fieldsSettings.seriesGenres.enabled) {
					seriesGenres.push(...(frontmatter[fieldsSettings.seriesGenres.propertyName] || []));
				}
			});

			let pluginContent = '';
			const startIdx = existingContent.indexOf(GROUPED_CONTENT_START);
			const endIdx = existingContent.indexOf(CONTENT_DELIMITER);
			if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
				pluginContent = existingContent.substring(
					startIdx + GROUPED_CONTENT_START.length,
					endIdx
				).trim();
			} else {
				console.warn("Grouped content start or delimiter not found in existing note.", existingFile.name);
				return null;
			}

			const existingBooks: Record<string, { sortNumber: number; content: string }> = {};
			const bookRegex = /%%ohp-book-start-(\d+)-(\d+)%%([\s\S]*?)%%ohp-book-end-\1-\2%%/g;
			let match;
			while ((match = bookRegex.exec(pluginContent)) !== null) {
				const bookId = match[1];
				const sortNumber = Number(match[2]);
				const content = match[3].trim();
				existingBooks[bookId] = {
					sortNumber,
					content,
				};
			}

			for (const book of bookMetadata) {
				const stringBookId = book.hardcoverBookId.toString();
				let bookExistingContent = existingBooks[stringBookId]?.content || "";
				const newContent = this.groupedNoteBookContent(type, book, bookExistingContent);
				const sortNumber = book.groupInformationSeries?.seriesPosition || book.groupInformationAuthor?.releaseYear || 0;
				
				existingBooks[stringBookId] = {
					content: newContent,
					sortNumber: sortNumber
				}

				const status = Array.isArray(book.status) ? book.status[0] : book.status;
				if (typeof status === "string" && status in HARDCOVER_STATUS_MAP_REVERSE) {
					booksToStatus[stringBookId] = HARDCOVER_STATUS_MAP_REVERSE[status as keyof typeof HARDCOVER_STATUS_MAP_REVERSE];
				}

				aliases.push(book.title); // escape quotes for frontmatter
				if (type === "series" && fieldsSettings.seriesGenres.enabled) {
					seriesGenres.push(...(book.genres || []));
				}
			}

			const newGroupedBookContent = Object.entries(existingBooks)
				.sort((a, b) => a[1].sortNumber - b[1].sortNumber)
				.map(([_bookId, bookData]) => {
					return bookData.content
				})
				.join("\n\n");

			// let newContent = existingContent.substring(0, startIdx  + GROUPED_CONTENT_START.length) + newGroupedBookContent + existingContent.substring(endIdx);
			let newPluginContent = type === "series" ? SERIES_GROUPED_NOTE_TEMPLATE : AUTHOR_GROUPED_NOTE_TEMPLATE;


			if (type === "series") {
				if (type === "series" && fieldsSettings.seriesGenres.enabled) {
					const formattedGenres = this.formatGenres([...new Set(seriesGenres)]);
					const groupedGenresContent = SERIES_GROUPED_GENRES_TEMPLATE.replace(/{{seriesGenres}}/g, formattedGenres.join(", "));

					newPluginContent = newPluginContent.replace("{{SERIES_GROUPED_GENRES_TEMPLATE}}", groupedGenresContent);
				}
			}

			newPluginContent = newPluginContent.replace(/{{booksContents}}/g, newGroupedBookContent);

			const newContent = existingContent.substring(0, startIdx) + newPluginContent + existingContent.substring(endIdx);

			await this.vault.modify(existingFile, newContent);

			const booksPerStatus: Record<string, string[]> = {
			};
			if (fieldsSettings.booksToRead.enabled) {
				booksPerStatus[fieldsSettings.booksToRead.propertyName] = [];
			}
			if (fieldsSettings.booksReading.enabled) {
				booksPerStatus[fieldsSettings.booksReading.propertyName] = [];
			}
			if (fieldsSettings.booksRead.enabled) {
				booksPerStatus[fieldsSettings.booksRead.propertyName] = [];
			}
			if (fieldsSettings.booksDNF.enabled) {
				booksPerStatus[fieldsSettings.booksDNF.propertyName] = [];
			}

			let totalBooks = 0;
			for (const [bookId, statusId] of Object.entries(booksToStatus)) {
				totalBooks++;
				switch (statusId) {
					case 1: // Want to Read
						booksPerStatus[fieldsSettings.booksToRead.propertyName]?.push(bookId);
						break;
					case 2: // Currently Reading
						booksPerStatus[fieldsSettings.booksReading.propertyName]?.push(bookId);
						break;
					case 3: // Read
						booksPerStatus[fieldsSettings.booksRead.propertyName]?.push(bookId);
						break;
					case 5: // Did Not Finish
						booksPerStatus[fieldsSettings.booksDNF.propertyName]?.push(bookId);
						break;
				}	
			}

			await this.fileManager.processFrontMatter(existingFile, (frontmatter) =>{
				for (const [statusString, ids] of Object.entries(booksPerStatus)) {
					frontmatter[statusString] = ids;
				}
				if (fieldsSettings.bookCount.enabled) { 
					frontmatter[fieldsSettings.bookCount.propertyName] = totalBooks;
				}
				if( groupAddAliases && frontmatter.aliases) {
					frontmatter.aliases = [...new Set(aliases)];
				}
				if (dateModifiedPropertyName) {
					frontmatter[dateModifiedPropertyName] = new Date().toISOString();
				}
				if (type === "series" && fieldsSettings.seriesGenres.enabled) {
					frontmatter[fieldsSettings.seriesGenres.propertyName] = [...new Set(seriesGenres)];
				}
			});

			return existingFile;
		} catch (error) {
			console.error("Error updating note:", error);
			return null;
		}
	}
}


// {
//     "hardcoverBookId": 435731,
//     "bodyContent": {
//         "title": "Ghostwritten",
//         "coverUrl": "https://assets.hardcover.app/external_data/59386766/2054b59cc8a6bdf036acb455e0227432bf673d51.jpeg"
//     },
//     "title": "Ghostwritten",
//     "status": [
//         "Want to Read"
//     ],
//     "cover": "https://assets.hardcover.app/external_data/59386766/2054b59cc8a6bdf036acb455e0227432bf673d51.jpeg",
//     "authors": [
//         "David Mitchell"
//     ],
//     "releaseDate": "1999-08-19",
//     "description": "'ONE OF THE MOST BRILLIANTLY INVENTIVE WRITERS OF THIS, OR ANY, COUNTRY' INDEPENDENT Winner of the Mail on Sunday/John Llewellyn Rhys Prize 'Astonishingly accomplished' THE TIMES 'Remarkable' OBSERVER 'Gripping' NEW YORK TIMES 'Fabulously atmospheric' GUARDIAN 'Engrossing' DAILY MAIL A magnificent achievement and an engrossing experience, David Mitchell's first novel announced the arrival of one of the most exciting writers of the twenty-first century. An apocalyptic cult member carries out a gas attack on a rush-hour metro, but what links him to a jazz buff in downtown Tokyo? Or to a Mongolian gangster, a woman on a holy mountain who talks to a tree, and a late night New York DJ? Set at the fugitive edges of Asia and Europe, Ghostwritten weaves together a host of characters, their interconnected destinies determined by the inescapable forces of cause and effect. PRAISE FOR DAVID MITCHELL 'A thrilling and gifted writer' FINANCIAL TIMES 'Dizzyingly, dazzlingly good' DAILY MAIL 'Mitchell is, clearly, a genius' NEW YORK TIMES BOOK REVIEW 'An author of extraordinary ambition and skill' INDEPENDENT ON SUNDAY 'A superb storyteller' THE NEW YORKER",
//     "url": "https://hardcover.app/books/ghostwritten",
//     "genres": [
//         "Fantasy",
//         "Fiction",
//         "Science fiction"
//     ]
// }