import { FieldsSettings, PluginSettings } from "src/types";
import { HARDCOVER_STATUS_MAP } from "./statusMapping";

export const DEFAULT_FIELDS_SETTINGS: FieldsSettings = {
	rating: { enabled: true, propertyName: "rating" },
	status: { enabled: true, propertyName: "status" },
	review: { enabled: true, propertyName: "review" },

	title: { enabled: true, propertyName: "title" },
	cover: { enabled: true, propertyName: "cover" },
	authors: { enabled: true, propertyName: "authors" },
	contributors: { enabled: true, propertyName: "contributors" },
	releaseDate: { enabled: true, propertyName: "releaseDate" },
	url: { enabled: true, propertyName: "url" },

	description: { enabled: true, propertyName: "description" },
	series: {
		enabled: true,
		propertyName: "seriesName",
	},
	genres: { enabled: true, propertyName: "genres" },

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
	readYears: { enabled: false, propertyName: "readYears" },
	bookCount: { enabled: true, propertyName: "bookCount" },
	bookCountShelves: { enabled: true, propertyName: "bookCountShelves" },
	bookCountRead: { enabled: true, propertyName: "bookCountRead" },
	bookCountToRead: { enabled: true, propertyName: "bookCountToRead" },
	bookCountDNF: { enabled: true, propertyName: "bookCountDNF" },
};

export const DEFAULT_FILENAME_FORMAT = "${title} (${year})";
export const DEFAULT_AUTHOR_FILENAME_FORMAT = "${authorName}";
export const DEFAULT_SERIES_FILENAME_FORMAT = "${name}";

export const DEFAULT_SETTINGS: PluginSettings = {
	settingsVersion: 1,
	apiKey: "",
	lastSyncTimestamp: "",
	userId: null,
	booksCount: null,
	fieldsSettings: DEFAULT_FIELDS_SETTINGS,
	dataSourcePreferences: {
		titleSource: "edition",
		coverSource: "edition",
		releaseDateSource: "edition",
		authorsSource: "edition",
		contributorsSource: "edition",
	},
	statusMapping: HARDCOVER_STATUS_MAP,
	targetFolder: "HardcoverBooks",
	groupAuthorTargetFolder: "HardcoverBooks/Authors",
	groupSeriesTargetFolder: "HardcoverBooks/Series",
	filenameTemplate: DEFAULT_FILENAME_FORMAT,
	groupAuthorFilenameTemplate: DEFAULT_AUTHOR_FILENAME_FORMAT,
	groupSeriesFilenameTemplate: DEFAULT_SERIES_FILENAME_FORMAT,
};
