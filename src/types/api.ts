export type { ApiErrorResponse } from "@/lib/api/response";

export type ApiSuccessResponse<T = unknown> = {
  data: T;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
