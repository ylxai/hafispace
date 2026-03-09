/**
 * Pagination utilities dengan safe parsing.
 */

export function parsePaginationParams(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const pageStr = searchParams.get("page") ?? "1";
  const limitStr = searchParams.get("limit") ?? "20";

  const page = Math.max(1, parseInt(pageStr, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPaginationResponse(
  page: number,
  limit: number,
  total: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
