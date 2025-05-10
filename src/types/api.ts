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
