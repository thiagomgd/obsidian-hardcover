import * as https from "https";
import {
	LibraryPageParams,
	FetchLibraryParams,
	PluginSettings,
} from "../types";
import { HARDCOVER_API } from "src/config";
import { GetUserIdResponse, GraphQLResponse, HardcoverUser } from "src/types";
import { QueryBuilder } from "./QueryBuilder";

export class HardcoverAPI {
	private settings: PluginSettings;
	private queryBuilder: QueryBuilder;

	constructor(settings: PluginSettings) {
		this.settings = settings;
		this.queryBuilder = new QueryBuilder(settings);
	}

	// Update the query if settings change
	updateSettings(settings: PluginSettings) {
		this.settings = settings;
		this.queryBuilder = new QueryBuilder(settings); // update query builder
	}

	async makeRequest(
		options: https.RequestOptions,
		data?: string
	): Promise<any> {
		return new Promise((resolve, reject) => {
			const req = https.request(options, (res) => {
				let responseData = "";

				res.on("data", (chunk) => {
					responseData += chunk;
				});

				res.on("end", () => {
					try {
						if (
							res.statusCode &&
							res.statusCode >= 200 &&
							res.statusCode < 300
						) {
							const jsonResponse = JSON.parse(responseData);
							resolve(jsonResponse);
						} else {
							reject(
								new Error(`API request failed with status ${res.statusCode}`)
							);
						}
					} catch (error) {
						reject(new Error(`Failed to parse API response: ${error.message}`));
					}
				});
			});

			req.on("error", (error) => {
				reject(new Error(`Network error: ${error.message}`));
			});

			if (data) {
				req.write(data);
			}

			req.end();
		});
	}

	async graphqlRequest<T>(query: string, variables?: any): Promise<any> {
		// console.log(query);

		const data = JSON.stringify({
			query,
			variables,
		});

		// remove Bearer if it exists since HC currently includes it in the string it copies
		let apiKey = this.settings.apiKey.trim();

		if (apiKey.toLowerCase().startsWith("bearer ")) {
			apiKey = apiKey.substring(7);
		}

		const options = {
			hostname: HARDCOVER_API.GRAPHQL_URL,
			path: HARDCOVER_API.GRAPHQL_PATH,
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				"Content-Length": data.length,
			},
		};

		const response: GraphQLResponse<T> = await this.makeRequest(options, data);

		if (response.errors && response.errors.length > 0) {
			throw new Error(`GraphQL Error: ${response.errors[0].message}`);
		}

		return response.data;
	}

	async fetchEntireLibrary({
		userId,
		totalBooks,
		updatedAfter,
		onProgress,
	}: FetchLibraryParams): Promise<any[]> {
		if (totalBooks === 0) {
			return [];
		}

		const pageSize = 100;
		const allBooks: any[] = [];
		let currentOffset = 0;

		while (currentOffset < totalBooks) {
			// calculate the actual limit for this page (could be less than pageSize for the last page)
			const limit = Math.min(pageSize, totalBooks - currentOffset);

			// Fetch page
			const booksPage = await this.fetchLibraryPage({
				userId,
				offset: currentOffset,
				limit,
				updatedAfter,
			});
			allBooks.push(...booksPage);

			// if less books than requested or reached the total, exit
			if (booksPage.length < limit || allBooks.length >= totalBooks) {
				break;
			}

			// Update offset for next page
			currentOffset += booksPage.length;

			// Report progress
			if (onProgress) {
				const processed = Math.min(currentOffset, totalBooks);
				onProgress(processed, totalBooks);
			}
		}

		return allBooks.slice(0, totalBooks);
	}

	async fetchLibraryPage({
		userId,
		offset,
		limit = 100,
		updatedAfter,
	}: LibraryPageParams): Promise<any[]> {
		const query = this.queryBuilder.buildUserBooksQuery(
			offset,
			limit,
			updatedAfter
		);

		const variables = {
			userId,
			offset,
			limit,
			...(updatedAfter ? { updatedAfter } : {}),
		};

		const data = await this.graphqlRequest(query, variables);
		return data.user_books;
	}

	async fetchBooksCount(userId: number): Promise<number> {
		const query = `
			query GetBooksCount {
				user_books_aggregate(where: {user_id: {_eq: ${userId}}}) {
					aggregate {
						count
					}
				}
			}
		`;

		const data = await this.graphqlRequest(query);
		const {
			user_books_aggregate: {
				aggregate: { count },
			},
		} = data;

		return count;
	}

	async fetchUserId(): Promise<HardcoverUser | undefined> {
		const query = `
			query GetUserId {
				me {
					id
				}
			}
		`;

		const data = await this.graphqlRequest<GetUserIdResponse>(query);
		return data.me[0];
	}
}
