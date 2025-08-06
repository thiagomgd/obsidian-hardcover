export const IS_DEV = global.IS_DEV;

export const HARDCOVER_API = {
	GRAPHQL_URL: "api.hardcover.app",
	GRAPHQL_PATH: "/v1/graphql",
};

export const HARDCOVER_URL = "https://hardcover.app";
export const HARDCOVER_BOOKS_ROUTE = "books";

export const GROUPED_CONTENT_START = "<!-- obsidian-hardcover-plugin-start -->";
export const CONTENT_DELIMITER = "<!-- obsidian-hardcover-plugin-end -->";
export const GROUPED_NOTE_TEMPLATE = `{{frontmatter}}
## Books

<!-- obsidian-hardcover-plugin-start -->
{{booksContents}}
<!-- obsidian-hardcover-plugin-end -->
`

export const GROUPED_NOTE_BOOK_TEMPLATE = `
<!-- obsidian-hardcover-book-{{bookId}}-start -->
### {{title}}

Status: {{status}}

> [!figure-right-s] ![cover]({{cover}})

> {{description}}

Genres: {{genres}}

{{hardcoverUrl}}

{{myReview}}
<!-- obsidian-hardcover-book-{bookId}-personal -->
<!-- obsidian-hardcover-book-{bookId}-end -->
`

export const REVIEW_TEMPLATE = `
## My Review

{{review}}
`;