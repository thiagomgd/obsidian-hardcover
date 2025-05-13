import { FieldsSettings, PluginSettings } from "src/types";

export class QueryBuilder {
	private settings: PluginSettings;

	constructor(settings: PluginSettings) {
		this.settings = settings;
	}

	buildUserBooksQuery(offset: number, limit: number): string {
		const fieldsSettings = this.settings.fieldsSettings;
		const dataPrefs = this.settings.dataSourcePreferences;

		const userBooksFields = this.buildUserBooksFields(fieldsSettings);
		const bookFields = this.buildBookFields(fieldsSettings, dataPrefs);
		const editionFields = this.buildEditionFields(fieldsSettings, dataPrefs);
		const readsFields = this.buildReadsFields(fieldsSettings);

		return `
            query GetUserLibrary($userId: Int!, $offset: Int!, $limit: Int!) {
                user_books(
                    where: {user_id: {_eq: $userId}}
                    order_by: {book_id: asc}
                    offset: $offset
                    limit: $limit
                ) {
                    # Core fields - always included
                    book_id
                    updated_at
                    
                    ${userBooksFields}
                    
                    book {
                        ${bookFields}
                    }
                    
                    edition {
                        ${editionFields}
                    }
                    
                    ${readsFields}
                }
            }
        `;
	}

	private buildUserBooksFields(settings: FieldsSettings): string {
		const fields: string[] = [];

		if (settings.rating.enabled) {
			fields.push("rating");
		}

		if (settings.status.enabled) {
			fields.push("status_id");
		}

		return fields.join("\n                    ");
	}

	private buildBookFields(
		settings: FieldsSettings,
		dataPrefs: PluginSettings["dataSourcePreferences"]
	): string {
		const fields: string[] = ["title"]; // always include at least one field to avoid empty selection in the query

		// release date from book level (if preferred)
		if (
			settings.releaseDate.enabled &&
			dataPrefs.releaseDateSource === "book"
		) {
			fields.push("release_date");
		}

		// cover from book level (if preferred)
		if (settings.cover.enabled && dataPrefs.coverSource === "book") {
			fields.push("cached_image");
		}

		if (settings.description.enabled) {
			fields.push("description");
		}

		return fields.join("\n                        ");
	}

	private buildEditionFields(
		settings: FieldsSettings,
		dataPrefs: PluginSettings["dataSourcePreferences"]
	): string {
		const fields: string[] = ["title"]; // always include at least one field to avoid empty selection in the query

		// title from edition level (if preferred)
		if (settings.title.enabled && dataPrefs.titleSource === "edition") {
			fields.push("title");
		}

		// release date from edition level (if preferred)
		if (
			settings.releaseDate.enabled &&
			dataPrefs.releaseDateSource === "edition"
		) {
			fields.push("release_date");
		}

		// cover from edition level (if preferred)
		if (settings.cover.enabled && dataPrefs.coverSource === "edition") {
			fields.push("cached_image");
		}

		if (settings.contributors.enabled) {
			fields.push("cached_contributors");
		}

		if (settings.publisher.enabled) {
			fields.push(`publisher {
                            name
                        }`);
		}

		return fields.join("\n                        ");
	}

	private buildReadsFields(settings: FieldsSettings): string {
		// only include reads if any read-related fields are enabled
		if (
			settings.firstRead.enabled ||
			settings.lastRead.enabled ||
			settings.rereads.enabled
		) {
			return `user_book_reads(order_by: {started_at: asc}) {
                        started_at
                        finished_at
                    }`;
		}

		return "";
	}
}
