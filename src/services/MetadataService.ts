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

		const { titleSource, coverSource, releaseDateSource } =
			dataSourcePreferences;

		const { book, edition } = userBook;

		// add title (from book or edition based on user settings)
		const currentTitleSource = titleSource === "book" ? book : edition;
		if (currentTitleSource && currentTitleSource.title) {
			metadata[fieldsSettings.title.propertyName] = currentTitleSource.title;
		}

		// add rating if enabled and exists
		if (fieldsSettings.rating.enabled && userBook.rating !== null) {
			metadata[fieldsSettings.rating.propertyName] = `${userBook.rating}/5`;
		}

		// add status if enabled and exists
		if (fieldsSettings.status.enabled && userBook.status_id !== null) {
			metadata[fieldsSettings.status.propertyName] = this.mapStatus(
				userBook.status_id
			);
		}

		// add cover (from book or edition based on user settings)
		const currentCoverSource = coverSource === "book" ? book : edition;
		const coverUrl = currentCoverSource.cached_image?.url;
		if (fieldsSettings.cover.enabled && coverUrl) {
			metadata[fieldsSettings.cover.propertyName] = coverUrl;
		}

		// add authors
		if (fieldsSettings.authors.enabled && edition.cached_contributors) {
			const authors = this.extractAuthors(edition.cached_contributors);
			if (authors.length) {
				metadata[fieldsSettings.authors.propertyName] = authors;
			}
		}

		// add other contributors
		if (fieldsSettings.contributors.enabled && edition.cached_contributors) {
			const otherContributors = this.extractContributors(
				edition.cached_contributors
			);
			if (otherContributors.length) {
				metadata[fieldsSettings.contributors.propertyName] =
					otherContributors.map((c) => `${c.name} (${c.role})`);
			}
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

	private extractAuthors(contributorsData: Record<any, any>[]): string[] {
		if (!contributorsData || !Array.isArray(contributorsData)) {
			return [];
		}

		// filter for authors (null/empty contribution or explicitly "Author")
		const authors = contributorsData
			.filter(
				(item) =>
					!item.contribution ||
					item.contribution === "" ||
					item.contribution === "Author"
			)
			.map((item) => item.author?.name)
			.filter((name) => !!name) // remove any undefined/null names
			.slice(0, 5); // limit to 5 authors

		return authors;
	}

	private extractContributors(
		contributorsData: Record<any, any>[]
	): Array<{ name: string; role: string }> {
		if (!contributorsData || !Array.isArray(contributorsData)) {
			return [];
		}

		// Filter for non-authors (has a contribution that's not "Author")
		const contributors = contributorsData
			.filter((item) => item.contribution && item.contribution !== "Author")
			.map((item) => ({
				name: item.author?.name,
				role: item.contribution,
			}))
			.filter((name) => !!name) // remove any undefined/null names
			.slice(0, 5); // limit to 5 authors

		return contributors;
	}
}
