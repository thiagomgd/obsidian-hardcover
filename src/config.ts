import { FieldsSettings, PluginSettings } from "./types";

export const HARDCOVER_API = {
	GRAPHQL_URL: "api.hardcover.app",
	GRAPHQL_PATH: "/v1/graphql",
};

export const HARDCOVER_URL = "https://hardcover.app";
export const HARDCOVER_BOOKS_ROUTE = "books";

export const HARDCOVER_STATUS_MAP = {
	1: "Want to Read",
	2: "Currently Reading",
	3: "Read",
	4: "Did Not Finish",
};

export const DEFAULT_FIELDS_SETTINGS: FieldsSettings = {
	rating: { enabled: true, propertyName: "rating" },
	status: { enabled: true, propertyName: "status" },

	title: { enabled: true, propertyName: "title" },
	cover: { enabled: true, propertyName: "cover" },
	authors: { enabled: true, propertyName: "authors" },
	contributors: { enabled: true, propertyName: "contributors" },
	releaseDate: { enabled: true, propertyName: "releaseDate" },
	url: { enabled: true, propertyName: "url" },

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

export const DEFAULT_SETTINGS: PluginSettings = {
	apiKey: "",
	lastSyncTimestamp: "",
	userId: null,
	booksCount: null,
	fieldsSettings: DEFAULT_FIELDS_SETTINGS,
	dataSourcePreferences: {
		titleSource: "edition",
		coverSource: "edition",
		releaseDateSource: "edition",
	},
	statusMapping: HARDCOVER_STATUS_MAP,
	targetFolder: "HardcoverBooks",
	filenameTemplate: "${title} - (${year})",
};
