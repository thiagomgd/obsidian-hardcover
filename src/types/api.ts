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
