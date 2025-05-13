import { TFile, Vault } from "obsidian";
import { HardcoverUserBook } from "src/types";
import { FileUtils } from "src/utils/FileUtils";

export class NoteService {
	constructor(private vault: Vault, private fileUtils: FileUtils) {}

	async createNote(bookMetadata: any): Promise<TFile | null> {
		try {
			const title = bookMetadata.title || "Untitled";
			const releaseYear = bookMetadata.release_date
				? new Date(bookMetadata.releaseDate).getFullYear()
				: "";

			const filename = this.fileUtils.generateFilename(title, releaseYear);

			// create frontmatter
			const frontmatter = this.createFrontmatter(bookMetadata);

			// TODO: create full note content
			const noteContent = `---\n${frontmatter}\n---\n\n# ${title}\n`;

			let file;
			if (await this.vault.adapter.exists(filename)) {
				// if file exists, write to it and then get the file reference
				await this.vault.adapter.write(filename, noteContent);
				file = this.vault.getAbstractFileByPath(filename) as TFile;
				console.log(`Updated note: ${filename}`);
			} else {
				// create new file
				file = await this.vault.create(filename, noteContent);
				console.log(`Created note: ${filename}`);
			}

			return file;
		} catch (error) {
			console.error("Error creating note:", error);
			return null;
		}
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
