export interface HardcoverUser {
	id: number;
}

export interface GetUserIdResponse {
	me: HardcoverUser[];
}

export interface GraphQLResponse<T> {
	data?: T;
	errors?: Array<{
		message: string;
	}>;
}

export interface LibraryPageParams {
	userId: number;
	offset: number;
	limit: number;
}

export interface FetchLibraryParams {
	userId: number;
	totalBooks: number;
	onProgress?: (current: number, total: number) => void;
}

export interface HardcoverUserBook {
	book_id: number;
	updated_at: string;
	rating: number;
	status_id: number;
	book: HardcoverBook;
	edition: HardcoverEdition;
	user_book_reads: HardcoverUserBooksReads[];
}

interface HardcoverBook {
	title: string;
	description: string;
	release_date: string;
	cached_image: Record<string, any>;
	slug: string;
}

interface HardcoverEdition {
	title: string;
	release_date: string;
	cached_image: Record<string, any>;
	cached_contributors: Record<string, any>[];
	publisher: {
		name: string;
	};
}

export interface HardcoverUserBooksReads {
	started_at: string;
	finished_at: string;
}
