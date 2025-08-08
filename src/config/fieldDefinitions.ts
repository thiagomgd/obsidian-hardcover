import { FieldDefinition } from "src/types";

// settings order can be rearranged by changing this
export const FIELD_DEFINITIONS: FieldDefinition[] = [
	{
		key: "title",
		name: "Title",
		description: "Book title",
		hasDataSource: true,
	},
	{
		key: "description",
		name: "Description",
		description: "Book description",
	},
	{
		key: "cover",
		name: "Cover",
		description: "Book cover image",
		hasDataSource: true,
	},
	{
		key: "releaseDate",
		name: "Release Date",
		description: "Publication date",
		hasDataSource: true,
	},
	{
		key: "series",
		name: "Series",
		description: "Series information",
	},
	{
		key: "authors",
		name: "Authors",
		description: "Book authors",
		hasDataSource: true,
	},
	{
		key: "contributors",
		name: "Contributors",
		description: "Other contributors (translators, narrators, etc.)",
		hasDataSource: true,
	},
	{
		key: "publisher",
		name: "Publisher",
		description: "Publisher name",
	},
	{ key: "url", name: "URL", description: "Hardcover URL" },
	{ key: "genres", name: "Genres", description: "Book genres" },
	{ key: "status", name: "Status", description: "Reading status" },
	{ key: "rating", name: "Rating", description: "Your rating" },
	{ key: "review", name: "Review", description: "Your review of the book" },
	{
		key: "firstRead",
		name: "First Read",
		description: "Start and end date of first read",
		isActivityDateField: true,
	},
	{
		key: "lastRead",
		name: "Last Read",
		description: "Start and end date of last read",
		isActivityDateField: true,
	},
	{
		key: "totalReads",
		name: "Total reads",
		description: "Times read",
	},
	{
		key: "readYears",
		name: "Read Years",
		description: "List of years when the book was read",
	},
	// GROUPED_NOTE_FIELDS 
	{
		key: "bookCount",
		name: "Book Count",
		description: "Total books for Author/Series",
	}, 
	{
		key: "booksToRead",
		name: "Books To Read",
		description: "books to read for Author/Series",
	}, 
	{
		key: "booksReading",
		name: "Books Reading",
		description: "books reading for Author/Series",
	}, 
	{
		key: "booksRead",
		name: "Books Read",
		description: "books to read for Author/Series",
	}, 
	{
		key: "booksDNF",
		name: "Books DNF",
		description: "books DNF for Author/Series",
	}, 
	{
		key: "seriesGenres",
		name: "Series Genres",
		description: "Grouped genres for all books in the series",
	}, 
	// END GROUPED_NOTE_FIELDS
];
