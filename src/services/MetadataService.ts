import { HARDCOVER_BOOKS_ROUTE, HARDCOVER_URL } from "src/config/constants";
import { HARDCOVER_STATUS_MAP_REVERSE } from "src/config/statusMapping";
import {
	AuthorMetadata,
	BookMetadata,
	HardcoverBookSeries,
	HardcoverUserBook,
	HardcoverUserBooksReads,
	PluginSettings,
	SeriesMetadata,
} from "src/types";

export class MetadataService {
	private settings: PluginSettings;

	constructor(settings: PluginSettings) {
		this.settings = settings;
	}

	updateSettings(settings: PluginSettings): void {
		this.settings = settings;
	}

	buildMetadata(userBook: HardcoverUserBook, includeGroupData = false): BookMetadata {
		const { fieldsSettings, dataSourcePreferences } = this.settings;
		const metadata: BookMetadata = {
			// always include the Hardcover book id
			hardcoverBookId: userBook.book_id,
			bodyContent: {},
		};

		const { titleSource, coverSource, releaseDateSource } =
			dataSourcePreferences;

		const { book, edition, user_book_reads: readingActivity } = userBook;

		// add title (from book or edition based on user settings)
		const currentTitleSource = titleSource === "book" ? book : edition;
		if (currentTitleSource && currentTitleSource.title) {
			// add to frontmatter
			metadata[fieldsSettings.title.propertyName] = currentTitleSource.title;
			//add to body
			metadata.bodyContent.title = currentTitleSource.title;
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

		// add review to bodyContent if enabled and exists
		if (fieldsSettings.review.enabled) {
			let userReview;
			if (userBook.review && userBook.review.trim()) {
				userReview = userBook.review;
			} else if (userBook.review_raw && userBook.review_raw.trim()) {
				userReview = userBook.review_raw;
			}

			metadata.bodyContent.review = userReview;
		}

		// add cover (from book or edition based on user settings)
		const currentCoverSource = coverSource === "book" ? book : edition;
		const coverUrl = currentCoverSource.cached_image?.url;
		if (fieldsSettings.cover.enabled && coverUrl) {
			// add to frontmatteer
			metadata[fieldsSettings.cover.propertyName] = coverUrl;
			// add to body
			metadata.bodyContent.coverUrl = coverUrl;
		}

		// add authors
		if (fieldsSettings.authors.enabled) {
			let authors: string[] = [];
			let mainAuthor = null;
			if (
				dataSourcePreferences.authorsSource === "book" &&
				book.cached_contributors
			) {
				authors = this.extractAuthors(book.cached_contributors);
				mainAuthor = this.extractFirstAuthorWithId(book.cached_contributors);
			} else if (
				dataSourcePreferences.authorsSource === "edition" &&
				edition.cached_contributors
			) {
				authors = this.extractAuthors(edition.cached_contributors);
				mainAuthor = this.extractFirstAuthorWithId(book.cached_contributors);
			}

			if (authors.length) {
				metadata[fieldsSettings.authors.propertyName] = authors;
				if (includeGroupData && mainAuthor) {
					metadata.groupInformationAuthor = {
						authorName: mainAuthor.name,
						authorId: mainAuthor.id,
					};
				}
			}
		}

		// add other contributors
		if (fieldsSettings.contributors.enabled) {
			let otherContributors: Array<{ name: string; role: string }> = [];
			if (
				dataSourcePreferences.contributorsSource === "book" &&
				book.cached_contributors
			) {
				otherContributors = this.extractContributors(book.cached_contributors);
			} else if (
				dataSourcePreferences.contributorsSource === "edition" &&
				edition.cached_contributors
			) {
				otherContributors = this.extractContributors(
					edition.cached_contributors
				);
			}

			if (otherContributors.length) {
				metadata[fieldsSettings.contributors.propertyName] =
					otherContributors.map((c) => `${c.name} (${c.role})`);
			}
		}

		// add release date (from book or edition based on user settings)
		const currentReleaseDateSource =
			releaseDateSource === "book" ? book : edition;
		if (
			fieldsSettings.releaseDate.enabled &&
			currentReleaseDateSource.release_date
		) {
			metadata[fieldsSettings.releaseDate.propertyName] =
				currentReleaseDateSource.release_date;

			// also extract release year for grouping by author/series
			if (includeGroupData && currentReleaseDateSource.release_date) {
				const releaseYear = new Date(
					currentReleaseDateSource.release_date
				).getFullYear();
				if (!isNaN(releaseYear)) {
					metadata.groupInformationAuthor = {
						...(metadata.groupInformationAuthor || {}),
						releaseYear: releaseYear,
					};
				}
			}
		}

		// add description
		if (fieldsSettings.description.enabled && book.description) {
			metadata[fieldsSettings.description.propertyName] = book.description;
		}

		// add url
		if (fieldsSettings.url.enabled && book.slug) {
			metadata[
				fieldsSettings.url.propertyName
			] = `${HARDCOVER_URL}/${HARDCOVER_BOOKS_ROUTE}/${book.slug}`;
		}

		// add publisher
		if (fieldsSettings.publisher.enabled && edition.publisher?.name) {
			metadata[fieldsSettings.publisher.propertyName] = edition.publisher.name;
		}

		// add series
		if (fieldsSettings.series.enabled && book.book_series) {
			const seriesArray = this.extractSeriesInfo(book.book_series);
			if (seriesArray.length > 0) {
				metadata[fieldsSettings.series.propertyName] = seriesArray;
			}
			if (includeGroupData && book.book_series.length > 0) {
				// for grouping, just take the first series
				const firstSeries: HardcoverBookSeries = book.book_series[0];
				if (firstSeries.series) {
					metadata.groupInformationSeries = {
						seriesName: firstSeries.series.name,
						seriesId: firstSeries.series.id,
						seriesPosition: firstSeries.position,
					};
				}
			}
		}

		// add genres
		if (
			fieldsSettings.genres.enabled &&
			book.cached_tags &&
			book.cached_tags.Genre
		) {
			const genres = book.cached_tags.Genre.map((tag: any) => tag.tag).filter(
				(genre: string) => !!genre
			);

			if (genres.length > 0) {
				metadata[fieldsSettings.genres.propertyName] = genres;
			}
		}

		// add reading activity
		if (
			fieldsSettings.firstRead.enabled ||
			fieldsSettings.lastRead.enabled ||
			fieldsSettings.totalReads.enabled
		) {
			const activity = this.extractReadingActivity(readingActivity);

			// add first read
			if (fieldsSettings.firstRead.enabled && activity.firstRead) {
				metadata[fieldsSettings.firstRead.startPropertyName] =
					activity.firstRead.start;

				metadata[fieldsSettings.firstRead.endPropertyName] =
					activity.firstRead.end;
			}

			// add last read
			if (fieldsSettings.lastRead.enabled && activity.lastRead) {
				metadata[fieldsSettings.lastRead.startPropertyName] =
					activity.lastRead.start;

				metadata[fieldsSettings.lastRead.endPropertyName] =
					activity.lastRead.end;
			}

			// add number of total reads
			if (fieldsSettings.totalReads.enabled && activity.totalReads) {
				metadata[fieldsSettings.totalReads.propertyName] = activity.totalReads;
			}

			// add read years
			if (fieldsSettings.readYears.enabled && activity.readYears.length > 0) {
				metadata[fieldsSettings.readYears.propertyName] = activity.readYears;
			}
		}

		return metadata;
	}

	public buildGroupedMetadata(
		type: "author" | "series",
		id: number,
		name: string,
		books: BookMetadata[]
	): AuthorMetadata | SeriesMetadata{
		let metadata: AuthorMetadata | SeriesMetadata;
		// create arrays for each status if enabled in settings
		const { fieldsSettings } = this.settings;

		if (type === "author") {
			metadata = {
				hardcoverAuthorId: id,
				authorName: name,
				bodyContent: {},
			};
		} else {
			 metadata = {
				hardcoverSeriesId: id,
				seriesName: name,
				bodyContent: {},
			};
		}

		if (books.length === 0) {
			return metadata; // no books, return empty metadata
		}

		if (this.settings.groupAddAliases) {
			metadata.aliases = [];
		}
		if (fieldsSettings.seriesGenres.enabled && type === "series") {
			metadata[fieldsSettings.seriesGenres.propertyName] = [];
		}
		metadata.bodyContent.name = name;
		metadata.bodyContent.books = [];


		
		if (fieldsSettings.bookCount.enabled) {
			metadata[fieldsSettings.bookCount.propertyName] = 0;
		}
		if (fieldsSettings.booksToRead.enabled) {
			metadata[fieldsSettings.booksToRead.propertyName] = [];
		}
		if (fieldsSettings.booksReading.enabled) {
			metadata[fieldsSettings.booksReading.propertyName] = [];
		}
		if (fieldsSettings.booksRead.enabled) {
			metadata[fieldsSettings.booksRead.propertyName] = [];
		}
		if (fieldsSettings.booksDNF.enabled) {
			metadata[fieldsSettings.booksDNF.propertyName] = [];
		}

		for (const book of books) {
			metadata.bodyContent.books.push(book);
			// "1": "Want to Read",
			// "2": "Currently Reading",
			// "3": "Read",
			// "5": "Did Not Finish"
			// TODO: fix mess
			const statusKey = Array.isArray(book.status) ? book.status[0] as keyof typeof HARDCOVER_STATUS_MAP_REVERSE : book.status as keyof typeof HARDCOVER_STATUS_MAP_REVERSE;
			const statusId: number = HARDCOVER_STATUS_MAP_REVERSE[statusKey];

			const strId = book.hardcoverBookId.toString();
			switch (statusId) {	
				case 1: // Want to Read
					metadata[fieldsSettings.booksToRead.propertyName]?.push(strId);
					break;
				case 2: // Currently Reading
					metadata[fieldsSettings.booksReading.propertyName]?.push(strId);
					break;
				case 3: // Read
					metadata[fieldsSettings.booksRead.propertyName]?.push(strId);
					break;
				case 5: // Did Not Finish
					metadata[fieldsSettings.booksDNF.propertyName]?.push(strId);
					break;
			}
			fieldsSettings.bookCount.enabled && metadata[fieldsSettings.bookCount.propertyName]++;
			if (this.settings.groupAddAliases && book.bodyContent.title) {
				// add book title as alias
				metadata.aliases?.push(book.bodyContent.title);
			}

			metadata[fieldsSettings.seriesGenres.propertyName]?.push(...(book[fieldsSettings.genres.propertyName] || []));
		}
		
		if (metadata.seriesGenres) {
			// remove duplicates and sort
			metadata[fieldsSettings.seriesGenres.propertyName] = Array.from(new Set(metadata[fieldsSettings.seriesGenres.propertyName])).sort();
		}

		return metadata;
	}

	private mapStatus(statusId: number): string[] {
		const statusText =
			this.settings.statusMapping[statusId] || `Unknown (${statusId})`;
		// return as array so obsidian property is a list
		return [statusText];
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

	private extractFirstAuthorWithId(contributorsData: Record<any, any>[]): { name: string; id: number } | null {
		if (!contributorsData || !Array.isArray(contributorsData)) {
			return null;
		}

		// filter for authors (null/empty contribution or explicitly "Author")
		const authors = contributorsData
			.filter(
				(item) =>
					!item.contribution ||
					item.contribution === "" ||
					item.contribution === "Author"
			)
			// for now we'll keep authors without name
			// .filter((name) => !!name) // remove any undefined/null names
			.map((item) => {return {name: item.author?.name, id: item.author?.id}})

		return authors[0];
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
				role: this.capitalizeFirstLetter(item.contribution),
			}))
			.filter((name) => !!name) // remove any undefined/null names
			.slice(0, 5); // limit to 5 authors

		return contributors;
	}

	private extractReadingActivity(reads: HardcoverUserBooksReads[]) {
		if (!reads || !Array.isArray(reads) || reads.length === 0) {
			return { firstRead: null, lastRead: null, totalReads: 0, readYears: [] };
		}

		// create a copy of the array
		const sortedReads = [...reads];

		// sort by started_at date (oldest first)
		sortedReads.sort((a, b) => {
			const dateA = new Date(a.started_at || "");
			const dateB = new Date(b.started_at || "");
			return dateA.getTime() - dateB.getTime();
		});

		// first read is the oldest - first after sorting
		const firstRead = sortedReads[0];

		// last read is the newest - last after sorting
		const lastRead = sortedReads[sortedReads.length - 1];

		const totalReads = sortedReads.length;

		// extract array of unique years from reading activity
		const readYears = sortedReads
			.map((read) => {
				// try to get the year from finished_at, fall back to started_at
				const dateStr = read.finished_at || read.started_at;
				if (!dateStr) return null;

				try {
					return new Date(dateStr).getFullYear().toString();
				} catch (e) {
					console.warn("Error parsing date:", dateStr, e);
					return null;
				}
			})
			.filter((year): year is string => year !== null)
			.filter((year, index, self) => self.indexOf(year) === index)
			.sort();

		return {
			firstRead: {
				start: firstRead.started_at || null,
				end: firstRead.finished_at || null,
			},
			lastRead: {
				start: lastRead.started_at || null,
				end: lastRead.finished_at || null,
			},
			totalReads,
			readYears,
		};
	}

	private extractSeriesInfo(seriesData: HardcoverBookSeries[]): string[] {
		if (!seriesData || !Array.isArray(seriesData) || seriesData.length === 0) {
			return [];
		}

		return seriesData
			.filter((series) => series.series?.name)
			.map((series) => {
				const seriesName = series.series.name;
				if (series.position) {
					return `${seriesName} #${series.position}`;
				}
				return seriesName;
			});
	}

	private capitalizeFirstLetter(text: string): string {
		if (!text) return "";
		return text.charAt(0).toUpperCase() + text.slice(1);
	}
}
