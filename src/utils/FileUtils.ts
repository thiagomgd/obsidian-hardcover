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
}
