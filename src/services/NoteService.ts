import { TFile, Vault } from "obsidian";
import { CONTENT_DELIMITER } from "src/config";
import ObsidianHardcover from "src/main";
import { FileUtils } from "src/utils/FileUtils";

export class NoteService {
	constructor(
		private vault: Vault,
		private fileUtils: FileUtils,
		private plugin: ObsidianHardcover
	) {
		this.plugin = plugin;
	}

	async createNote(bookMetadata: any): Promise<TFile | null> {
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
		bookMetadata: any,
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
		const title = this.getBookTitle(bookMetadata);
		let content = this.getFrontmatterString(frontmatter, title);

		// add book cover if enabled
		if (this.plugin.settings.fieldsSettings.cover.enabled) {
			const coverProperty =
				this.plugin.settings.fieldsSettings.cover.propertyName;
			if (bookMetadata[coverProperty]) {
				content += `\n![${title} Cover](${bookMetadata[coverProperty]})\n`;
			}
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

	private getFrontmatterString(frontmatter: string, title: string) {
		return `---\n${frontmatter}\n---\n\n# ${title}\n`;
	}

	private createFrontmatter(metadata: Record<string, any>): string {
		return Object.entries(metadata)
			.map(([key, value]) => {
				if (Array.isArray(value)) {
					return `${key}: ${JSON.stringify(value)}`;
				} else if (typeof value === "string") {
					if (key === "description") {
						// handle description field converting newlines to escaped lines
						const escapedValue = value.replace(/\n/g, "\\n");
						return `${key}: "${escapedValue.replace(/"/g, '\\"')}"`;
					} else {
						// for other string fields, just escape quotes
						return `${key}: "${value.replace(/"/g, '\\"')}"`;
					}
				} else {
					return `${key}: ${value}`;
				}
			})
			.join("\n");
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

						// check if hardcover_book_id matches
						const idMatch = frontmatter.match(/hardcover_book_id:\s*(\d+)/);
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
}
