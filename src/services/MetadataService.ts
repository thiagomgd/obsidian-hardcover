import { HardcoverUserBook, PluginSettings } from "src/types";

export class MetadataService {
	private settings: PluginSettings;

	constructor(settings: PluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: PluginSettings): void {
		this.settings = settings;
	}

	buildMetadata(userBook: HardcoverUserBook): any {
		const { fieldsSettings, dataSourcePreferences } = this.settings;
		const metadata: Record<string, any> = {
			// always include the Hardcover book id
			hardcover_book_id: userBook.book_id,
		};

		// add title (from book or edition based on user settings)
		const source =
			dataSourcePreferences.titleSource === "book"
				? userBook.book
				: userBook.edition;
		if (source && source.title) {
			metadata[fieldsSettings.title.propertyName] = source.title;
		}

		// add rating if enabled and exists
		if (fieldsSettings.rating.enabled && userBook.rating !== null) {
			metadata[fieldsSettings.rating.propertyName] = userBook.rating;
		}

		// add status if enabled and exists
		if (fieldsSettings.status.enabled && userBook.status_id !== null) {
			metadata[fieldsSettings.status.propertyName] = this.mapStatus(
				userBook.status_id
			);
		}

		return metadata;
	}

	private mapStatus(statusId: number): string {
		const statusMap: Record<number, string> = {
			1: "Want To Read",
			2: "Currently Reading",
			3: "Read",
			4: "DNF",
		};

		return statusMap[statusId] || `Unknown (${statusId})`;
	}
}
