/** Shared API envelope shapes returned by the SriPon backend. */

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination?: Pagination;
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors: Record<string, string[]>;
  status?: number;
}