import { TFile, Vault } from "obsidian";
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
			const { title, releaseYear } = this.getNoteTitleData(bookMetadata);

			const filename = this.fileUtils.generateFilename(title, releaseYear);

			const targetFolder = this.fileUtils.normalizePath(
				this.plugin.settings.targetFolder
			);
			await this.ensureFolderExists(targetFolder);
			const fullPath = targetFolder ? `${targetFolder}/${filename}` : filename;

			// create frontmatter
			const frontmatter = this.createFrontmatter(bookMetadata);

			// TODO: create full note content
			const noteContent = this.getFrontmatterString(frontmatter, title);

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
			const frontmatter = this.createFrontmatter(bookMetadata);
			const title = this.getBookTitle(bookMetadata);

			const noteContent = this.getFrontmatterString(frontmatter, title);

			await this.vault.modify(existingFile, noteContent);
			console.log(`Updated note: ${existingFile.path}`);

			return existingFile;
		} catch (error) {
			console.error("Error updating note:", error);
			return null;
		}
	}

	private getBookTitle(bookMetadata: any) {
		const titleProperty =
			this.plugin.settings.fieldsSettings.title.propertyName;

		return bookMetadata[titleProperty] || "Untitled";
	}

	private getNoteTitleData(bookMetadata: any) {
		const title = this.getBookTitle(bookMetadata);
		const releaseDateProperty =
			this.plugin.settings.fieldsSettings.releaseDate.propertyName;

		const releaseYear = bookMetadata[releaseDateProperty]
			? new Date(bookMetadata.releaseDate).getFullYear()
			: "";

		return { title, releaseYear };
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
					// escape strings with special characters
					return `${key}: "${value.replace(/"/g, '\\"')}"`;
				} else {
					return `${key}: ${value}`;
				}
			})
			.join("\n");
	}

	// TODO
	// async findNoteByHardcoverId(id: string): Promise<TFile | null> {
	// 	return null;
	// }
}
