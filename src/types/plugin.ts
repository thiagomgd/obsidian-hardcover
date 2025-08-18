export interface PluginSettings {
	settingsVersion: number;
	apiKey: string;
	lastSyncTimestamp: string;
	userId: number | null;
	booksCount: number | null;

	// field configuration
	fieldsSettings: FieldsSettings;

	// data source preferences
	dataSourcePreferences: {
		titleSource: DataSource;
		coverSource: DataSource;
		releaseDateSource: DataSource;
		authorsSource: DataSource;
		contributorsSource: DataSource;
	};

	statusMapping: {
		[key: number]: string; // map hardcover status_id to custom string, will be put in array to allow for list type property in obsidian
	};

	targetFolder: string;
	groupAuthorTargetFolder: string;
	groupSeriesTargetFolder: string;
	filenameTemplate: string;
	groupAuthorFilenameTemplate: string;
	groupSeriesFilenameTemplate: string;
	groupAddAliases: boolean; // whether to add aliases to grouped notes based on author/series names
	dateCreatedPropertyName?: string; // optional property name for date created in frontmatter
	dateModifiedPropertyName?: string; // optional property name for date modified in frontmatter
	genresAsTags?: string; // format for genres as tags (Only in note body) - empty means no formatting.
	groupSeriesAllFolders?: string; // semicolon separated list of folders to search for series notes, used in findNoteByHCId
	groupAuthorAllFolders?: string;
}

type DataSource = 'book' | 'edition';
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
	review: FieldConfig;

	// book or edition fields
	title: FieldConfig;
	cover: FieldConfig;
	authors: FieldConfig;
	contributors: FieldConfig;
	releaseDate: FieldConfig;

	// book fields
	description: FieldConfig;
	url: FieldConfig;
	series: FieldConfig;
	genres: FieldConfig;

	// edition fields
	publisher: FieldConfig;

	// user_book_reads fields
	firstRead: ActivityDateFieldConfig;
	lastRead: ActivityDateFieldConfig; // enabling firstRead/lastRead will create both start/end properties in the frontmatter
	totalReads: FieldConfig;

	readYears: FieldConfig;

	// grouped note specific fields
	bookCount: FieldConfig;
	booksToRead: FieldConfig;
	booksReading: FieldConfig;
	booksRead: FieldConfig;
	booksDNF: FieldConfig;
	seriesGenres: FieldConfig;
}

export interface FieldDefinition {
	key: keyof FieldsSettings;
	name: string;
	description: string;
	hasDataSource?: boolean;
	isActivityDateField?: boolean;
}

export interface BookMetadata {
	hardcoverBookId: number;
	bodyContent: {
		title?: string;
		coverUrl?: string;
		review?: string;
	};
	groupInformationAuthor?: {
		authorName?: string;
		authorId?: number;
		releaseYear?: number;
	};
	groupInformationSeries?: {
		seriesName?: string;
		seriesId?: number;
		seriesPosition?: number;
	};
	// allow for dynamic properties based on user custom property names
	[key: string]: any;
}

export interface GroupedCommonMetadata {
	bookCount?: number;
	bookCountShelves?: number;
	bookCountRead?: number;
	bookCountToRead?: number;
	bodyContent: {
		name?: string;
		authorUrl?: string;
		// list of books by this author, sorted by release date ascending
		books?: BookMetadata[];
	};
	aliases?: string[]; // optional aliases for the series
	// allow for dynamic properties based on user custom property names
	[key: string]: any;
}

export interface AuthorMetadata extends GroupedCommonMetadata {
	hardcoverAuthorId: number;
	authorName: string;
}

export interface SeriesMetadata extends GroupedCommonMetadata {
	hardcoverSeriesId: number;
	seriesName: string;
}
