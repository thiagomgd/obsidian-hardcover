export interface PluginSettings {
	apiKey: string;
	lastSyncTimestamp: string;
	userId: number | null;
	booksCount: number | null;

	// field configuration
	fieldsSettings: FieldsSettings;

	// data source preferences
	dataSourcePreferences: {
		titleSource: "book" | "edition";
		coverSource: "book" | "edition";
		releaseDateSource: "book" | "edition";
	};
}

export interface FieldConfig {
	enabled: boolean;
	propertyName: string;
}

export interface ActivityDateFieldConfig extends FieldConfig {
	startPropertyName: string;
	endPropertyName: string;
}

export interface FieldsSettings {
	// user_books fields
	rating: FieldConfig;
	status: FieldConfig;

	// book or edition fields
	title: FieldConfig;
	cover: FieldConfig;
	authors: FieldConfig;
	contributors: FieldConfig;
	releaseDate: FieldConfig;

	// book fields
	description: FieldConfig;
	genres: FieldConfig;
	series: FieldConfig;

	// edition fields
	publisher: FieldConfig;

	// user_book_reads fields
	firstRead: ActivityDateFieldConfig;
	lastRead: ActivityDateFieldConfig; // enabling firstRead/lastRead will create both start/end properties in the frontmatter
	totalReads: FieldConfig;
}

export const DEFAULT_FIELDS_SETTINGS: FieldsSettings = {
	rating: { enabled: true, propertyName: "rating" },
	status: { enabled: true, propertyName: "status" },

	title: { enabled: true, propertyName: "title" },
	cover: { enabled: true, propertyName: "cover" },
	authors: { enabled: true, propertyName: "authors" },
	contributors: { enabled: true, propertyName: "contributors" },
	releaseDate: { enabled: true, propertyName: "releaseDate" },

	description: { enabled: true, propertyName: "description" },
	genres: { enabled: true, propertyName: "genres" },
	series: { enabled: true, propertyName: "series" },

	publisher: { enabled: true, propertyName: "publisher" },

	firstRead: {
		enabled: true,
		propertyName: "firstRead",
		startPropertyName: "firstReadStart",
		endPropertyName: "firstReadEnd",
	},
	lastRead: {
		enabled: true,
		propertyName: "lastRead",
		startPropertyName: "lastReadStart",
		endPropertyName: "lastReadEnd",
	},
	totalReads: { enabled: true, propertyName: "totalReads" },
};

export interface FieldDefinition {
	key: keyof FieldsSettings;
	name: string;
	description: string;
	hasDataSource?: boolean;
	isActivityDateField?: boolean;
}
