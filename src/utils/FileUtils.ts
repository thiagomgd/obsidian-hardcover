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
}
