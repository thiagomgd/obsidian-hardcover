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

	statusMapping: {
		[key: number]: string; // map hardcover status_id to custom string, will be put in array to allow for list type property in obsidian
	};

	targetFolder: string;
	filenameTemplate: string;
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
	url: FieldConfig;

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

export interface FieldDefinition {
	key: keyof FieldsSettings;
	name: string;
	description: string;
	hasDataSource?: boolean;
	isActivityDateField?: boolean;
}
