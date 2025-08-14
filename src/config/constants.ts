export const IS_DEV = global.IS_DEV;

export const HARDCOVER_API = {
	GRAPHQL_URL: 'api.hardcover.app',
	GRAPHQL_PATH: '/v1/graphql',
};

export const HARDCOVER_URL = 'https://hardcover.app';
export const HARDCOVER_BOOKS_ROUTE = 'books';

export const GROUPED_CONTENT_START = '%%ohp-start%%';
export const CONTENT_DELIMITER = '%%ohp-end%%';
export const AUTHOR_GROUPED_NOTE_TEMPLATE = `%%ohp-start%%
{{booksContents}}
%%ohp-end%%
`;
export const SERIES_GROUPED_NOTE_TEMPLATE = `%%ohp-start%%
{{SERIES_GROUPED_GENRES_TEMPLATE}}
{{booksContents}}
%%ohp-end%%
`;

export const PERSONAL_CONTENT_START = '%%ohp-book-personal%%';
// sortNumber is Year for author, Position for series
// this is necessary so we can update the notes and insert new books in the right order
export const AUTHOR_GROUPED_NOTE_BOOK_TEMPLATE = `%%ohp-book-start-{{bookId}}-{{sortNumber}}%%
## {{title}}

Status: {{status}}

> [!summary]+
> > [!figure-right-s] ![cover]({{cover}})
>
{{description}}

Genres: {{genres}}

{{hardcoverUrl}}

{{myReview}}
${PERSONAL_CONTENT_START}
{{personalContent}}
%%ohp-book-end-{{bookId}}-{{sortNumber}}%%
`;

export const SERIES_GROUPED_NOTE_BOOK_TEMPLATE = `%%ohp-book-start-{{bookId}}-{{sortNumber}}%%
## {{title}}

Status: {{status}} {{rating}}

> [!summary]+
> > [!figure-right-s] ![cover]({{cover}})
>
{{description}}

{{hardcoverUrl}}

{{myReview}}
%%ohp-book-personal%%
{{personalContent}}
%%ohp-book-end-{{bookId}}-{{sortNumber}}%%
`;

export const REVIEW_TEMPLATE = `
### My Review

{{review}}
`;

export const RATING_TEMPLATE = `Rating: {{rating}}`;

export const GROUPED_GENRES_START = '%%ohp-groupedgenres-start%%';
export const GROUPED_GENRES_END = '%%ohp-groupedgenres-end%%';
export const SERIES_GROUPED_GENRES_TEMPLATE = `${GROUPED_GENRES_START}Genres: {{seriesGenres}} ${GROUPED_GENRES_END}`;
