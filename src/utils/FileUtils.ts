export class FileUtils {
	generateFilename(title: string, year?: string | number): string {
		const sanitizedTile = this.sanitizeFilename(title);
		const filename = year ? `${sanitizedTile} - ${year}` : sanitizedTile;
		return `${filename}.md`;
	}

	sanitizeFilename(name: string): string {
		return name
			.replace(/[\\/:*?"<>|]/g, "") // remove illegal characters
			.replace(/\s+/g, " ") // replace multiple spaces with single space
			.trim(); // remove leading/trailing spaces
	}

	normalizePath(path: string): string {
		// remove leading and trailing slashes
		let normalized = path.replace(/^\/+|\/+$/g, "");
		// remove duplicate slashes
		normalized = normalized.replace(/\/+/g, "/");
		return normalized;
	}

	isRootOrEmpty(path: string): boolean {
		const normalizedPath = this.normalizePath(path);
		return !normalizedPath || normalizedPath === "/";
	}

	processFilenameTemplate(template: string, metadata: any): string {
		let filename = template;

		if (metadata.title) {
			filename = filename.replace(/\${title}/g, metadata.title);
		}

		if (metadata.authors && Array.isArray(metadata.authors)) {
			const authorsString = metadata.authors.join(", ");
			filename = filename.replace(/\${authors}/g, authorsString);
		}

		if (metadata.releaseDate) {
			try {
				const year = new Date(metadata.releaseDate).getFullYear();
				filename = filename.replace(/\${year}/g, year.toString());
			} catch (error) {
				console.error("Error extracting year from release date:", error);
			}
		}

		// replace any unsupported template variables with empty string
		filename = filename.replace(/\${[^}]+}/g, "");
		return this.sanitizeFilename(filename) + ".md";
	}

	escapeMarkdownCharacters(text: string): string {
		// escape square brackets
		return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
	}
}
